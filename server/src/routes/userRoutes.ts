import { Request, Response, Router } from "express";
import { z } from "zod";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "../services/userService";
import {
  authenticate,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { toCsv } from "../utils/csv";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Extended schema with subscription fields
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean().optional(),
  mobile: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  domain: z.string().optional(),
  databaseUrl: z.string().optional(),
  numberOfUsers: z.number().int().positive().optional(),
  planType: z.enum(["basic", "pro"]).optional(),
  subscriptionDuration: z
    .enum(["monthly", "6months", "1year"])
    .optional(),
  accountStatus: z
    .enum(["pending_payment", "pending_approval", "active", "disabled"])
    .optional(),
  renewalDate: z.string().datetime().nullable().optional(),
  couponCode: z.string().optional(),
  couponDiscountAmount: z.string().optional(),
  couponCreatedAt: z.string().nullable().optional(),
  paymentBaseAmount: z.string().nullable().optional(),
  paymentDiscountAmount: z.string().nullable().optional(),
  paymentGstAmount: z.string().nullable().optional(),
  paymentFinalAmount: z.string().nullable().optional(),
});

// For updates, all fields optional
const updateSchema = userSchema.partial();

const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};

router.post("/validate-coupon", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const [userWithCoupon] = await db
      .select({
        couponCode: users.couponCode,
        couponDiscountAmount: users.couponDiscountAmount,
        couponCreatedAt: users.couponCreatedAt,
      })
      .from(users)
      .where(eq(users.couponCode, code))
      .limit(1);

    if (!userWithCoupon || !userWithCoupon.couponCode) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    // Check expiry (30 days)
    if (userWithCoupon.couponCreatedAt) {
      const expiryDate = new Date(userWithCoupon.couponCreatedAt);
      expiryDate.setDate(expiryDate.getDate() + 30);
      if (new Date() > expiryDate) {
        return res.status(400).json({ message: "Coupon code has expired" });
      }
    }

    return res.json({
      valid: true,
      discountAmount: Number(userWithCoupon.couponDiscountAmount || 0),
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return res.status(500).json({ message: "Unable to validate coupon" });
  }
});

router.use(authenticate, requireAdmin);

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await listUsers();
    const filteredUsers = users.filter((user) => user.id !== req.user?.userId);
    return res.json({ users: filteredUsers });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = userSchema.parse(req.body);

    if (!body.password) {
      return res
        .status(400)
        .json({ message: "Password is required for new users" });
    }

    const user = await createUser({
      ...body,
      password: body.password!,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
      couponCreatedAt: body.couponCreatedAt ? new Date(body.couponCreatedAt) : undefined,
    } as any);
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request payload" });
    }
    return res.status(500).json({ message: "Unable to create user" });
  }
});

router.get("/export", async (_req: Request, res: Response) => {
  try {
    const usersList = await listUsers();
    const csv = toCsv(
      usersList.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        companyName: user.companyName,
        companyAddress: user.companyAddress,
        role: user.role,
        domain: user.domain,
        databaseUrl: user.databaseUrl,
        numberOfUsers: user.numberOfUsers,
        planType: user.planType,
        subscriptionDuration: user.subscriptionDuration,
        accountStatus: user.accountStatus,
        renewalDate: user.renewalDate,
        createdAt: user.createdAt,
        machineId: user.machineId,
      })),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="users.csv"');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ message: "Failed to export CSV" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const body = updateSchema.parse(req.body);
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // Fetch current user to check if payment is completed
    const [existingUser] = await db
      .select({ 
        accountStatus: users.accountStatus,
        paymentFinalAmount: users.paymentFinalAmount
      })
      .from(users)
      .where(eq(users.id, id));

    // A payment is considered completed if accountStatus is not 'pending_payment'
    // and a final amount snapshot exists (captured during successful payment)
    const isPaymentCompleted = 
      existingUser?.accountStatus !== "pending_payment" && 
      existingUser?.paymentFinalAmount;

    if (isPaymentCompleted) {
      // If payment is completed, prevent changing coupon/discount
      if (req.body.couponCode !== undefined || req.body.couponDiscountAmount !== undefined) {
        return res.status(403).json({
          message: "Cannot modify coupon or discount for a completed payment."
        });
      }
    }

    if (body.renewalDate) {
      body.renewalDate = new Date(body.renewalDate) as any;
    } else if (body.renewalDate === null) {
      body.renewalDate = null as any;
    }

    if (body.couponCreatedAt) {
      body.couponCreatedAt = new Date(body.couponCreatedAt) as any;
    } else if (body.couponCreatedAt === null) {
      body.couponCreatedAt = null as any;
    }

    if (body.couponDiscountAmount === "") {
      body.couponDiscountAmount = null as any;
    }

    const user = await updateUser(id, body as any);
    return res.json({ user: user ? sanitizeUser(user) : null });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return res.status(400).json({
        message: "Validation failed",
        errors: error.errors,
      });
    }
    console.error("Update error:", error);
    return res.status(400).json({
      message: error?.message || "Unable to update user",
    });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (req.user?.userId === id) {
      return res.status(403).json({
        message: "Admin cannot delete their own account.",
      });
    }

    await deleteUser(id);
    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete user" });
  }
});

export default router;
