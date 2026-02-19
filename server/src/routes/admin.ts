// routes/admin.ts

import express from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
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
