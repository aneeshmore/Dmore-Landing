"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const userService_1 = require("../services/userService");
const auth_1 = require("../middleware/auth");
const csv_1 = require("../utils/csv");
const router = (0, express_1.Router)();
// Extended schema with subscription fields
const userSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional(),
    role: zod_1.z.enum(["admin", "user"]),
    domain: zod_1.z.string().optional(),
    numberOfUsers: zod_1.z.number().int().positive().optional(),
    planType: zod_1.z.enum(["basic", "pro"]).optional(),
    subscriptionDuration: zod_1.z
        .enum(["monthly", "quarterly", "6months", "1year"])
        .optional(),
    accountStatus: zod_1.z.enum(["active", "disabled"]).optional(),
    renewalDate: zod_1.z.string().datetime().optional(),
});
// For updates, all fields optional
const updateSchema = userSchema.partial();
const sanitizeUser = (user) => {
    const { password, ...rest } = user;
    return rest;
};
router.use(auth_1.authenticate, auth_1.requireAdmin);
router.get("/", async (_req, res) => {
    try {
        const users = await (0, userService_1.listUsers)();
        return res.json({ users });
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
        // Convert renewalDate string → Date
        if (body.renewalDate) {
            body.renewalDate = new Date(body.renewalDate);
        }
        const user = await (0, userService_1.createUser)(body);
        return res.status(201).json({ user: sanitizeUser(user) });
    }
    catch (error) {
        return res.status(400).json({
            message: error?.message || "Unable to create user",
        });
    }
});
router.get("/export/csv", async (_req, res) => {
    try {
        const users = await (0, userService_1.listUsers)();
        const csv = (0, csv_1.toCsv)(users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            domain: user.domain ?? "",
            planType: user.planType ?? "",
            accountStatus: user.accountStatus ?? "",
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
        const user = await (0, userService_1.updateUser)(id, body);
        return res.json({ user: user ? sanitizeUser(user) : null });
    }
    catch (error) {
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
        await (0, userService_1.deleteUser)(id);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to delete user" });
    }
});
exports.default = router;
