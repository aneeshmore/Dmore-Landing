"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const userService_1 = require("../services/userService");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    mobile: zod_1.z.string().min(6),
    companyName: zod_1.z.string().min(2),
    companyAddress: zod_1.z.string().min(4),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const sanitizeUser = (user) => {
    const { password, ...rest } = user;
    return rest;
};
router.post("/register", async (req, res) => {
    try {
        const body = registerSchema.parse(req.body);
        const user = await (0, userService_1.createUser)({ ...body, role: "user" });
        const token = (0, jwt_1.signToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return res.status(201).json({ token, user: sanitizeUser(user) });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: error.flatten() });
        }
        const message = error instanceof Error ? error.message : "Registration failed";
        return res.status(400).json({ message });
    }
});
router.post("/login", async (req, res) => {
    try {
        const body = loginSchema.parse(req.body);
        const user = await (0, userService_1.authenticateUser)(body.email, body.password);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = (0, jwt_1.signToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return res.json({ token, user: sanitizeUser(user) });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        return res.status(400).json({ message });
    }
});
router.get("/me", auth_1.authenticate, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await (0, userService_1.findUserById)(req.user.userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: sanitizeUser(user) });
});
exports.default = router;
