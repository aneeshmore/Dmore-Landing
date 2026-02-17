// routes/admin.ts

import express from "express";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

import { authenticate, requireAdmin } from "../middleware/auth";

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

export default router;
