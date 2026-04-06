"use strict";
// routes/admin.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const tenantRegistrationService_1 = require("../services/tenantRegistrationService");
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(6),
});
const registerTenantSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(3),
    databaseUrl: zod_1.z.string().url(),
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    mobile: zod_1.z.string().optional(),
    companyName: zod_1.z.string().optional(),
    companyAddress: zod_1.z.string().optional(),
    planType: zod_1.z.enum(["basic", "pro"]).optional(),
    subscriptionDuration: zod_1.z.enum(["monthly", "6months", "1year"]).optional(),
    numberOfUsers: zod_1.z.string().optional(), // Receive as string from form
    renewalDate: zod_1.z.string().optional(),
    accountStatus: zod_1.z.enum(["pending_payment", "pending_approval", "active", "disabled"]).optional(),
});
const router = express_1.default.Router();
const isMissingPaymentColumnError = (error) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (message.includes("payment_base_amount") ||
        message.includes("payment_discount_amount") ||
        message.includes("payment_gst_amount") ||
        message.includes("payment_final_amount"));
};
router.get("/registered-users", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        let registeredUsers = [];
        try {
            registeredUsers = await db_1.db
                .select({
                id: schema_1.users.id,
                name: schema_1.users.name,
                email: schema_1.users.email,
                mobile: schema_1.users.mobile,
                companyName: schema_1.users.companyName,
                companyAddress: schema_1.users.companyAddress,
                role: schema_1.users.role,
                domain: schema_1.users.domain,
                databaseUrl: schema_1.users.databaseUrl,
                numberOfUsers: schema_1.users.numberOfUsers,
                planType: schema_1.users.planType,
                subscriptionDuration: schema_1.users.subscriptionDuration,
                accountStatus: schema_1.users.accountStatus,
                paymentBaseAmount: schema_1.users.paymentBaseAmount,
                paymentDiscountAmount: schema_1.users.paymentDiscountAmount,
                paymentGstAmount: schema_1.users.paymentGstAmount,
                paymentFinalAmount: schema_1.users.paymentFinalAmount,
                renewalDate: schema_1.users.renewalDate,
                isActive: schema_1.users.isActive,
                createdAt: schema_1.users.createdAt,
            })
                .from(schema_1.users)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
        }
        catch (error) {
            if (!isMissingPaymentColumnError(error)) {
                throw error;
            }
            const fallbackUsers = await db_1.db
                .select({
                id: schema_1.users.id,
                name: schema_1.users.name,
                email: schema_1.users.email,
                mobile: schema_1.users.mobile,
                companyName: schema_1.users.companyName,
                companyAddress: schema_1.users.companyAddress,
                role: schema_1.users.role,
                domain: schema_1.users.domain,
                databaseUrl: schema_1.users.databaseUrl,
                numberOfUsers: schema_1.users.numberOfUsers,
                planType: schema_1.users.planType,
                subscriptionDuration: schema_1.users.subscriptionDuration,
                accountStatus: schema_1.users.accountStatus,
                renewalDate: schema_1.users.renewalDate,
                isActive: schema_1.users.isActive,
                createdAt: schema_1.users.createdAt,
            })
                .from(schema_1.users)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
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
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.put("/update-pricing", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { planType, monthlyPrice, sixMonthPrice, yearlyPrice } = req.body;
        if (!planType || monthlyPrice === undefined || sixMonthPrice === undefined || yearlyPrice === undefined) {
            return res.status(400).json({ message: "All prices are required." });
        }
        await db_1.db.update(schema_1.plans)
            .set({
            monthlyPrice: String(monthlyPrice),
            sixMonthPrice: String(sixMonthPrice),
            yearlyPrice: String(yearlyPrice)
        })
            .where((0, drizzle_orm_1.eq)(schema_1.plans.planType, planType));
        res.json({ message: `${planType.toUpperCase()} plan pricing updated successfully.` });
    }
    catch (error) {
        console.error("Update pricing failed:", error);
        res.status(500).json({ message: "Failed to update pricing." });
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
router.post("/add-tenant", auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { tenantId, databaseUrl, name, email, password, mobile, companyName, companyAddress, planType, subscriptionDuration, numberOfUsers, renewalDate, accountStatus } = registerTenantSchema.parse(req.body);
        // 1. Update or create the user record in the landing page database
        // We'll search by company name or domain if provided, but since this is for "Add New Client",
        // we might want to just store this registration.
        // ACTUALLY, the user wants to manage it via UI. So let's create a placeholder user if needed.
        const domain = `${tenantId}.localhost`; // Default logic
        (0, tenantRegistrationService_1.runTenantRegistration)(tenantId, databaseUrl)
            .then(async (stdout) => {
            try {
                const { createUser } = await Promise.resolve().then(() => __importStar(require("../services/userService")));
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
                    planType: planType,
                    subscriptionDuration: subscriptionDuration,
                    numberOfUsers: numberOfUsers ? parseInt(numberOfUsers) : 1,
                    accountStatus: accountStatus || "active",
                    renewalDate: renewalDate ? new Date(renewalDate) : undefined
                });
                console.log(`User ${email} created/synced in landing page DB`);
                res.json({ message: `Tenant ${tenantId} registered successfully`, output: stdout });
            }
            catch (dbError) {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: "Invalid request payload", errors: error.errors });
        }
        res.status(500).json({ message: "Unable to start registration process" });
    }
});
exports.default = router;
