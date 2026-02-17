"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const userService_1 = require("../services/userService");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const password_1 = require("../utils/password");
const router = (0, express_1.Router)();
const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@dmore.local";
const DEFAULT_ADMIN_PASSWORD = "admin@123";
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    mobile: zod_1.z.string().regex(/^\d{10}$/),
    companyName: zod_1.z.string().min(2),
    companyAddress: zod_1.z.string().min(4),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(1),
    password: zod_1.z.string().min(6),
});
const sanitizeUser = (user) => {
    const { password, ...rest } = user;
    return rest;
};
router.post("/register", async (req, res) => {
    try {
        const body = registerSchema.parse(req.body);
        if (body.email.toLowerCase() === ADMIN_EMAIL) {
            return res.status(403).json({ message: "This email is reserved" });
        }
        const user = await (0, userService_1.createUser)({
            ...body,
            role: "user",
        });
        const token = (0, jwt_1.signToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return res.status(201).json({ token, user: sanitizeUser(user) });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: "Please enter valid registration details.",
            });
        }
        const message = error instanceof Error ? error.message : "";
        if (message === "User already registered.") {
            return res.status(400).json({ message: "User already registered." });
        }
        return res.status(400).json({
            message: "Registration failed. Please try again.",
        });
    }
});
router.post("/login", async (req, res) => {
    try {
        const body = loginSchema.parse(req.body);
        const identifier = body.email.trim();
        if (identifier.toLowerCase() === ADMIN_USERNAME) {
            let adminUser = await (0, userService_1.findUserByEmail)(ADMIN_EMAIL);
            if (!adminUser) {
                adminUser = await (0, userService_1.createUser)({
                    name: "admin",
                    email: ADMIN_EMAIL,
                    password: DEFAULT_ADMIN_PASSWORD,
                    role: "admin",
                });
            }
            const isValid = await (0, password_1.verifyPassword)(body.password, adminUser.password);
            if (!isValid) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            if (adminUser.role !== "admin" || adminUser.isActive === false) {
                const updatedAdmin = await (0, userService_1.updateUser)(adminUser.id, {
                    role: "admin",
                    isActive: true,
                });
                if (updatedAdmin) {
                    adminUser = { ...adminUser, ...updatedAdmin };
                }
            }
            const token = (0, jwt_1.signToken)({
                userId: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
            });
            return res.json({ token, user: sanitizeUser(adminUser) });
        }
        const user = await (0, userService_1.authenticateUser)(identifier, body.password);
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
        return res.status(400).json({
            message: "Login failed. Please check your credentials.",
        });
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
