// routes/admin.ts

import express from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users, plans, transactions } from "../db/schema";
import { z } from "zod";
import { AuthenticatedRequest, authenticate, requireAdmin } from "../middleware/auth";
import { findUserById, updateUser } from "../services/userService";
import { verifyPassword } from "../utils/password";
import { exec } from "child_process";
import path from "path";
import { runTenantRegistration } from "../services/tenantRegistrationService";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const registerTenantSchema = z.object({
  tenantId: z.string().min(3),
  databaseUrl: z.string().url(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  mobile: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  planType: z.enum(["basic", "pro"]).optional(),
  subscriptionDuration: z.enum(["monthly", "6months", "1year"]).optional(),
  numberOfUsers: z.string().optional(), // Receive as string from form
  renewalDate: z.string().optional(),
  accountStatus: z.enum(["pending_payment", "pending_approval", "active", "disabled"]).optional(),
});

const router = express.Router();

const isMissingPaymentColumnError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("payment_base_amount") ||
    message.includes("payment_discount_amount") ||
    message.includes("payment_gst_amount") ||
    message.includes("payment_final_amount")
  );
};

router.get(
  "/registered-users",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const registeredUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

      // Fetch latest transaction for each user to get the permanent snapshot
      const latestTransactions = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt));

      const txMap: Record<number, any> = {};
      latestTransactions.forEach(tx => {
        const uId = Number(tx.userId);
        if (!txMap[uId]) {
          txMap[uId] = tx;
        }
      });

      const allPlans = await db.select().from(plans);
      const planMap: Record<string, any> = {};
      allPlans.forEach(p => {
        planMap[p.planType] = {
          monthly: Number(p.monthlyPrice),
          "6months": Number(p.sixMonthPrice),
          "1year": Number(p.yearlyPrice),
        };
      });

      const responseUsers = registeredUsers.map((user: any) => {
        const userId = Number(user.id);
        const latestTx = txMap[userId];

        // 1. Determine Expiry Status
        const now = new Date();
        const renewalDate = user.renewalDate ? new Date(user.renewalDate) : null;
        const isExpired = renewalDate ? renewalDate < now : false;

        // 2. Determine payment status (Strict source of truth)
        let paymentStatus: "pending" | "completed" | "failed" = "pending";
        if (latestTx && latestTx.status === "completed") {
          paymentStatus = "completed";
        } else if (user.paymentFinalAmount && user.accountStatus !== "pending_payment") {
          // Manual snapshot exists and not in a pending state
          paymentStatus = "completed";
        } else if (user.accountStatus === "disabled") {
          paymentStatus = "failed";
        }

        // 3. Derived User Status (Account Status + Expiry)
        let displayAccountStatus = user.accountStatus;
        if (isExpired && user.accountStatus !== "disabled") {
          displayAccountStatus = "expired";
        }

        // 4. Authoritative Active State (The Switch)
        // Must have completed payment AND not be expired AND not be manually disabled
        const isActive = paymentStatus === "completed" && !isExpired && user.accountStatus !== "disabled";

        // authoritative snapshot data
        let baseAmount = latestTx ? latestTx.baseAmount : user.paymentBaseAmount;
        let discountAmount = latestTx ? latestTx.discountAmount : user.paymentDiscountAmount;
        let gstAmount = latestTx ? latestTx.gstAmount : user.paymentGstAmount;
        let finalAmount = latestTx ? latestTx.finalAmount : user.paymentFinalAmount;

        const paymentDate = latestTx 
          ? latestTx.createdAt 
          : (user.renewalDate || user.createdAt);

        const transactionId = latestTx 
          ? (latestTx.razorpayPaymentId || `TXN-${latestTx.id}`) 
          : (paymentStatus === "completed" ? (user.paymentFinalAmount ? "MANUAL-SNAP" : "VERIFIED") : "N/A");

        return {
          ...user,
          paymentStatus,
          accountStatus: displayAccountStatus,
          isActive,
          // ONLY return values if they exist in DB snapshots. NEVER calculate from current plans.
          paymentBaseAmount: baseAmount || (paymentStatus === "completed" ? "N/A" : null),
          paymentDiscountAmount: discountAmount || (paymentStatus === "completed" ? "0.00" : null),
          paymentGstAmount: gstAmount || (paymentStatus === "completed" ? "N/A" : null),
          paymentFinalAmount: finalAmount || (paymentStatus === "completed" ? "N/A" : null),
          paymentDate,
          transactionId,
        };
      });

      res.json({ users: responseUsers });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.get("/plans", authenticate, requireAdmin, async (_req, res) => {
  try {
    const allPlans = await db.select().from(plans);
    res.json(allPlans);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

router.put("/plans/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { monthlyPrice, sixMonthPrice, yearlyPrice } = req.body;

    if (monthlyPrice === "") monthlyPrice = null;
    if (sixMonthPrice === "") sixMonthPrice = null;
    if (yearlyPrice === "") yearlyPrice = null;

    await db
      .update(plans)
      .set({
        monthlyPrice,
        sixMonthPrice,
        yearlyPrice,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, Number(id)));

    res.json({ message: "Plan updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update plan" });
  }
});

router.get("/transaction-summary", authenticate, requireAdmin, async (_req, res) => {
  try {
    const rawSummary = await db
      .select({
        id: users.id,
        email: users.email,
        planType: users.planType,
        subscriptionDuration: users.subscriptionDuration,
        accountStatus: users.accountStatus,
        renewalDate: users.renewalDate,
        paymentFinalAmount: users.paymentFinalAmount,
        couponDiscountAmount: users.couponDiscountAmount,
        transactionCount: sql<number>`cast(count(${transactions.id}) as integer)`,
        totalSpentFromLogs: sql<string>`coalesce(sum(cast(${transactions.finalAmount} as numeric)), 0)`,
      })
      .from(users)
      .leftJoin(transactions, eq(users.id, transactions.userId))
      .groupBy(
        users.id,
        users.email,
        users.planType,
        users.subscriptionDuration,
        users.accountStatus,
        users.renewalDate,
        users.paymentFinalAmount
      );

    const allPlans = await db.select().from(plans);
    const planMap: Record<string, any> = {};
    allPlans.forEach(p => {
      planMap[p.planType] = {
        monthly: Number(p.monthlyPrice),
        "6months": Number(p.sixMonthPrice),
        "1year": Number(p.yearlyPrice),
      };
    });

    const summary = rawSummary.map(row => {
      let spent = Number(row.totalSpentFromLogs);
      let count = row.transactionCount;

      // Ensure active users show at least one transaction using the same logic as AdminDashboard.tsx
      if (count === 0 && (row.accountStatus === "active" || row.renewalDate)) {
        if (row.paymentFinalAmount) {
          spent = Number(row.paymentFinalAmount);
        } else {
          const plan = (row.planType as string) || 'basic';
          const duration = (row.subscriptionDuration as string) || 'monthly';
          const base = planMap[plan]?.[duration] || 0;
          const discount = Number(row.couponDiscountAmount) || 0;
          const subtotal = Math.max(base - discount, 0);
          // Subtotal + 18% GST
          spent = Number((subtotal * 1.18).toFixed(2));
        }
        count = 1;
      }

      return {
        id: row.id,
        email: row.email,
        planType: row.planType,
        transactionCount: count,
        totalSpent: spent.toString(),
      };
    });

    res.json(summary);
  } catch (error) {
    console.error("Summary fetch error:", error);
    res.status(500).json({ message: "Failed to fetch transaction summary" });
  }
});

const PLAN_PRICING: any = {
  basic: { monthly: 1499, "6months": 7999, "1year": 14999 },
  pro: { monthly: 4999, "6months": 26999, "1year": 49999 },
};

router.get("/transactions/:userId", authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    // 1. Fetch real transactions
    const logs = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    // 2. Map fields to match requirement
    let userTransactions = logs.map(tx => ({
      ...tx,
      planName: tx.planType,
    }));

    // 3. Fallback logic exactly matching AdminDashboard.tsx
    if (userTransactions.length === 0) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user && (user.accountStatus === "active" || user.renewalDate)) {
        const plan = (user.planType as string) || 'basic';
        const duration = (user.subscriptionDuration as string) || 'monthly';
        const fallbackBase = PLAN_PRICING[plan]?.[duration] || 0;

        const baseAmount = user.paymentBaseAmount || String(fallbackBase);
        const discountAmount = user.paymentDiscountAmount || '0';
        const gstAmount = user.paymentGstAmount || String(Number((Number(baseAmount) - Number(discountAmount)) * 0.18).toFixed(2));
        const finalAmount = user.paymentFinalAmount || String(Number(baseAmount) - Number(discountAmount) + Number(gstAmount));

        userTransactions = [{
          id: `legacy-${user.id}` as any,
          userId: user.id,
          planType: plan,
          planName: plan,
          period: duration,
          baseAmount,
          discountAmount,
          gstAmount,
          finalAmount,
          razorpayOrderId: 'N/A',
          razorpayPaymentId: 'N/A',
          couponUsed: user.couponCode || null,
          status: 'completed',
          createdAt: user.renewalDate || user.createdAt,
        } as any];
      }
    }

    res.json(userTransactions);
  } catch (error) {
    console.error("User transactions fetch error:", error);
    res.status(500).json({ message: "Failed to fetch user transactions" });
  }
});

router.put(
  "/update-pricing",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { planType, monthlyPrice, sixMonthPrice, yearlyPrice } = req.body;
      if (!planType || monthlyPrice === undefined || sixMonthPrice === undefined || yearlyPrice === undefined) {
        return res.status(400).json({ message: "All prices are required." });
      }

      await db.update(plans)
        .set({
          monthlyPrice: String(monthlyPrice),
          sixMonthPrice: String(sixMonthPrice),
          yearlyPrice: String(yearlyPrice)
        })
        .where(eq(plans.planType, planType));

      res.json({ message: `${planType.toUpperCase()} plan pricing updated successfully.` });
    } catch (error) {
      console.error("Update pricing failed:", error);
      res.status(500).json({ message: "Failed to update pricing." });
    }
  }
);

router.post(
  "/change-password",
  authenticate,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(
        req.body,
      );

      if (!req.user?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const admin = await findUserById(req.user.userId);
      if (!admin) {
        return res.status(404).json({ message: "Admin user not found" });
      }

      const isValid = await verifyPassword(currentPassword, admin.password);
      if (!isValid) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      await updateUser(admin.id, { password: newPassword });
      return res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request payload" });
      }
      return res.status(500).json({ message: "Unable to update password" });
    }
  },
);

router.post(
  "/add-tenant",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        tenantId,
        databaseUrl,
        name,
        email,
        password,
        mobile,
        companyName,
        companyAddress,
        planType,
        subscriptionDuration,
        numberOfUsers,
        renewalDate,
        accountStatus
      } = registerTenantSchema.parse(req.body);

      // 1. Update or create the user record in the landing page database
      // We'll search by company name or domain if provided, but since this is for "Add New Client",
      // we might want to just store this registration.
      // ACTUALLY, the user wants to manage it via UI. So let's create a placeholder user if needed.

      const domain = `${tenantId}.localhost`; // Default logic

      runTenantRegistration(tenantId, databaseUrl)
        .then(async (stdout) => {
          try {
            const { createUser } = await import("../services/userService");

            await createUser({
              name,
              email,
              password,
              mobile: mobile || undefined,
              companyName: companyName || undefined,
              companyAddress: companyAddress || undefined,
              domain,
              databaseUrl,
              role: "user",
              isActive: true,
              planType: planType as "basic" | "pro",
              subscriptionDuration: subscriptionDuration as "monthly" | "6months" | "1year",
              numberOfUsers: numberOfUsers ? parseInt(numberOfUsers) : 1,
              accountStatus: accountStatus || "active",
              renewalDate: renewalDate ? new Date(renewalDate) : undefined
            });
            console.log(`User ${email} created/synced in landing page DB`);
            res.json({ message: `Tenant ${tenantId} registered successfully`, output: stdout });
          } catch (dbError: any) {
            console.error(`DB Sync Error: ${dbError.message}`);
            res.json({
              message: `Tenant ${tenantId} registered in OMS, but DB sync failed`,
              error: dbError.message,
              output: stdout
            });
          }
        })
        .catch((error) => {
          console.error(`Registration error: ${error.message}`);
          res.status(500).json({
            message: "Registration failed",
            error: error.message
          });
        });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request payload", errors: error.errors });
      }
      res.status(500).json({ message: "Unable to start registration process" });
    }
  }
);

export default router;
