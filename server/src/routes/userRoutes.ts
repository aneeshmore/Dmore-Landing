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
});

// For updates, all fields optional
const updateSchema = userSchema.partial();

const sanitizeUser = (user: any) => {
  const { password, ...rest } = user;
  return rest;
};

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

    // Convert renewalDate string → Date
    if (body.renewalDate) {
      body.renewalDate = new Date(body.renewalDate) as any;
    }

    const user = await createUser(body as any);
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || "Unable to create user",
    });
  }
});

router.get("/export/csv", async (_req: Request, res: Response) => {
  try {
    const users = await listUsers();

    const csv = toCsv(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        domain: user.domain ?? "",
        planType: user.planType ?? "",
        accountStatus: user.accountStatus ?? "",
        createdAt: user.createdAt,
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

    if (body.renewalDate) {
      body.renewalDate = new Date(body.renewalDate) as any;
    } else if (body.renewalDate === null) {
      body.renewalDate = null as any;
    }

    const user = await updateUser(id, body as any);
    return res.json({ user: user ? sanitizeUser(user) : null });
  } catch (error: any) {
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
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;
