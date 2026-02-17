"use strict";
// routes/admin.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const userService_1 = require("../services/userService");
const password_1 = require("../utils/password");
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(6),
});
const router = express_1.default.Router();
router.get("/registered-users", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const registeredUsers = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            mobile: schema_1.users.mobile,
            companyName: schema_1.users.companyName,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt,
        })
            .from(schema_1.users)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
        res.json({ users: registeredUsers });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
router.post("/change-password", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const admin = await (0, userService_1.findUserById)(req.user.userId);
        if (!admin) {
            return res.status(404).json({ message: "Admin user not found" });
        }
        const isValid = await (0, password_1.verifyPassword)(currentPassword, admin.password);
        if (!isValid) {
            return res
                .status(400)
                .json({ message: "Current password is incorrect" });
        }
        await (0, userService_1.updateUser)(admin.id, { password: newPassword });
        return res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid request payload" });
        }
        return res.status(500).json({ message: "Unable to update password" });
    }
});
exports.default = router;
