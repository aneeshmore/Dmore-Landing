// routes/admin.ts

import express from "express";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { z } from "zod";
import { AuthenticatedRequest, authenticate, requireAdmin } from "../middleware/auth";
import { findUserById, updateUser } from "../services/userService";
import { verifyPassword } from "../utils/password";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const router = express.Router();

router.get(
  "/registered-users",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const registeredUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mobile: users.mobile,
          companyName: users.companyName,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      res.json({ users: registeredUsers });
    } catch (error) {
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

export default router;
