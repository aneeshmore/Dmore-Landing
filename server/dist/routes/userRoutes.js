"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const userService_1 = require("../services/userService");
const auth_1 = require("../middleware/auth");
const csv_1 = require("../utils/csv");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// Extended schema with subscription fields
const userSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional(),
    role: zod_1.z.enum(["admin", "user"]),
    isActive: zod_1.z.boolean().optional(),
    mobile: zod_1.z.string().optional(),
    companyName: zod_1.z.string().optional(),
    companyAddress: zod_1.z.string().optional(),
    domain: zod_1.z.string().optional(),
    databaseUrl: zod_1.z.string().optional(),
    numberOfUsers: zod_1.z.number().int().positive().optional(),
    planType: zod_1.z.enum(["basic", "pro"]).optional(),
    subscriptionDuration: zod_1.z
        .enum(["monthly", "6months", "1year"])
        .optional(),
    accountStatus: zod_1.z
        .enum(["pending_payment", "pending_approval", "active", "disabled"])
        .optional(),
    renewalDate: zod_1.z.string().datetime().nullable().optional(),
    couponCode: zod_1.z.string().optional(),
    couponDiscountAmount: zod_1.z.string().optional(),
    couponCreatedAt: zod_1.z.string().nullable().optional(),
});
// For updates, all fields optional
const updateSchema = userSchema.partial();
const sanitizeUser = (user) => {
    const { password, ...rest } = user;
    return rest;
};
router.post("/validate-coupon", async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: "Coupon code is required" });
        }
        const [userWithCoupon] = await db_1.db
            .select({
            couponCode: schema_1.users.couponCode,
            couponDiscountAmount: schema_1.users.couponDiscountAmount,
            couponCreatedAt: schema_1.users.couponCreatedAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.couponCode, code))
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
    }
    catch (error) {
        console.error("Coupon validation error:", error);
        return res.status(500).json({ message: "Unable to validate coupon" });
    }
});
router.use(auth_1.authenticate, auth_1.requireAdmin);
router.get("/", async (req, res) => {
    try {
        const users = await (0, userService_1.listUsers)();
        const filteredUsers = users.filter((user) => user.id !== req.user?.userId);
        return res.json({ users: filteredUsers });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch users" });
    }
});
router.post("/", async (req, res) => {
    try {
        const body = userSchema.parse(req.body);
        if (!body.password) {
            return res
                .status(400)
                .json({ message: "Password is required for new users" });
        }
        const user = await (0, userService_1.createUser)({
            ...body,
            password: body.password,
            renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
            couponCreatedAt: body.couponCreatedAt ? new Date(body.couponCreatedAt) : undefined,
        });
        return res.status(201).json({ user: sanitizeUser(user) });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid request payload" });
        }
        return res.status(500).json({ message: "Unable to create user" });
    }
});
router.get("/export", async (_req, res) => {
    try {
        const usersList = await (0, userService_1.listUsers)();
        const csv = (0, csv_1.toCsv)(usersList.map((user) => ({
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
        })));
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="users.csv"');
        return res.send(csv);
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to export CSV" });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const body = updateSchema.parse(req.body);
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }
        if (body.renewalDate) {
            body.renewalDate = new Date(body.renewalDate);
        }
        else if (body.renewalDate === null) {
            body.renewalDate = null;
        }
        if (body.couponCreatedAt) {
            body.couponCreatedAt = new Date(body.couponCreatedAt);
        }
        else if (body.couponCreatedAt === null) {
            body.couponCreatedAt = null;
        }
        if (body.couponDiscountAmount === "") {
            body.couponDiscountAmount = null;
        }
        const user = await (0, userService_1.updateUser)(id, body);
        return res.json({ user: user ? sanitizeUser(user) : null });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
router.delete("/:id", async (req, res) => {
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
        await (0, userService_1.deleteUser)(id);
        return res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: "Unable to delete user" });
    }
});
exports.default = router;
