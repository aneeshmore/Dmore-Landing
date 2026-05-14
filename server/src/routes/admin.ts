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
      let registeredUsers: any[] = [];

      try {
        registeredUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            mobile: users.mobile,
            companyName: users.companyName,
            companyAddress: users.companyAddress,
            role: users.role,
            domain: users.domain,
            databaseUrl: users.databaseUrl,
            numberOfUsers: users.numberOfUsers,
            planType: users.planType,
            subscriptionDuration: users.subscriptionDuration,
            accountStatus: users.accountStatus,
            paymentBaseAmount: users.paymentBaseAmount,
            paymentDiscountAmount: users.paymentDiscountAmount,
            paymentGstAmount: users.paymentGstAmount,
            paymentFinalAmount: users.paymentFinalAmount,
            renewalDate: users.renewalDate,
            isActive: users.isActive,
            couponCode: users.couponCode,
            couponDiscountAmount: users.couponDiscountAmount,
            couponCreatedAt: users.couponCreatedAt,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt));
      } catch (error) {
        if (!isMissingPaymentColumnError(error)) {
          throw error;
        }

        const fallbackUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            mobile: users.mobile,
            companyName: users.companyName,
            companyAddress: users.companyAddress,
            role: users.role,
            domain: users.domain,
            databaseUrl: users.databaseUrl,
            numberOfUsers: users.numberOfUsers,
            planType: users.planType,
            subscriptionDuration: users.subscriptionDuration,
            accountStatus: users.accountStatus,
            renewalDate: users.renewalDate,
            isActive: users.isActive,
            couponCode: users.couponCode,
            couponDiscountAmount: users.couponDiscountAmount,
            couponCreatedAt: users.couponCreatedAt,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt));

        registeredUsers = fallbackUsers.map((entry) => ({
          ...entry,
          paymentBaseAmount: null,
          paymentDiscountAmount: null,
          paymentGstAmount: null,
          paymentFinalAmount: null,
        }));
      }

      res.json({
        users: registeredUsers.map((entry) => ({
          ...entry,
          paymentStatus: entry.renewalDate ? "completed" : "pending",
        })),
      });
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
        name: users.name,
        companyName: users.companyName,
        mobile: users.mobile,
        transactionCount: sql<number>`cast(count(${transactions.id}) as integer)`,
        totalSpentFromLogs: sql<string>`coalesce(sum(cast(${transactions.finalAmount} as numeric)), 0)`,
        userCreatedAt: users.createdAt,
        lastTransactionAt: sql<string>`max(${transactions.createdAt})`,
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
        users.paymentFinalAmount,
        users.createdAt,
        users.name,
        users.companyName,
        users.mobile,
        users.couponDiscountAmount
      );

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
          const base = PLAN_PRICING[plan]?.[duration] || 0;
          // Subtotal + 18% GST
          spent = Number((base * 1.18).toFixed(2));
        }
        count = 1;
      }

      return {
        id: row.id,
        email: row.email,
        planType: row.planType,
        transactionCount: count,
        totalSpent: spent.toString(),
        name: row.name,
        companyName: row.companyName,
        mobile: row.mobile,
        effectiveTimestamp: row.lastTransactionAt ? new Date(row.lastTransactionAt) : (row.userCreatedAt ? new Date(row.userCreatedAt) : new Date(0)),
      };
    });

    // Sort by latest transaction/activity first
    summary.sort((a, b) => b.effectiveTimestamp.getTime() - a.effectiveTimestamp.getTime());

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
