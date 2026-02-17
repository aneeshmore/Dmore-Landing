"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
/* ==========================
   RAZORPAY INSTANCE
========================== */
const razorpay = new razorpay_1.default({
    key_id: env_1.config.razorpayKeyId,
    key_secret: env_1.config.razorpayKeySecret,
});
const hasPlaceholderRazorpayKeys = () => /dummy|your_.*key/i.test(env_1.config.razorpayKeyId) ||
    /dummy|your_.*secret/i.test(env_1.config.razorpayKeySecret);
const getRazorpayErrorMessage = (error) => {
    const err = error;
    return (err?.error?.description ||
        err?.description ||
        err?.error?.reason ||
        err?.reason ||
        err?.message ||
        "Failed to create order");
};
/* ==========================
   PRICING
========================== */
console.log("🔥 PAYMENT ROUTES LOADED");
const pricing = {
    basic: {
        monthly: 1499,
        "6months": 7499,
        "1year": 11999,
    },
    pro: {
        monthly: 2999,
        "6months": 16499,
        "1year": 29999,
    },
};
/* ==========================
   VALIDATION SCHEMA
========================== */
const createOrderSchema = zod_1.z.object({
    planType: zod_1.z.enum(["basic", "pro"]),
    period: zod_1.z.enum(["monthly", "6months", "1year"]),
});
/* ==========================
   CREATE ORDER
========================== */
router.post("/create-order", auth_1.authenticate, async (req, res) => {
    try {
        if (hasPlaceholderRazorpayKeys()) {
            return res.status(500).json({
                message: "Razorpay keys are not configured. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.",
            });
        }
        const { planType, period } = createOrderSchema.parse(req.body);
        const requestingUser = await (0, userService_1.findUserById)(req.user.userId);
        if (!requestingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (requestingUser.role === "user" &&
            requestingUser.accountStatus !== "pending_payment") {
            return res.status(403).json({
                message: "Payment successful. Admin will contact you soon.",
            });
        }
        const amount = pricing[planType][period];
        if (!amount) {
            return res.status(400).json({
                message: "Invalid pricing configuration",
            });
        }
        const amountInPaise = amount * 100;
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                planType,
                period,
                userId: String(req.user.userId),
            },
        });
        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: env_1.config.razorpayKeyId,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(400).json({
                message: "Invalid create-order payload",
                issues: error.issues,
            });
        }
        const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 400;
        console.error("Create order failed:", {
            statusCode,
            error,
        });
        return res.status(statusCode).json({
            message: getRazorpayErrorMessage(error),
            debug: {
                code: error?.code ?? null,
                reason: error?.reason ?? error?.error?.reason ?? null,
                source: error?.source ?? error?.error?.source ?? null,
                step: error?.step ?? error?.error?.step ?? null,
                field: error?.field ?? error?.error?.field ?? null,
            },
        });
    }
});
/* ==========================
   VERIFY PAYMENT
========================== */
router.post("/verify-payment", auth_1.authenticate, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                message: "Missing payment details",
            });
        }
        /* ==========================
           1️⃣ VERIFY SIGNATURE
        ========================== */
        const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", env_1.config.razorpayKeySecret)
            .update(payload)
            .digest("hex");
        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Invalid signature",
            });
        }
        /* ==========================
           2️⃣ FETCH ORDER FROM RAZORPAY
        ========================== */
        const order = await razorpay.orders.fetch(razorpayOrderId);
        const notes = order.notes;
        if (!notes) {
            return res.status(400).json({
                message: "Order notes missing",
            });
        }
        const planType = notes.planType;
        const period = notes.period;
        const userId = Number(notes.userId);
        if (!planType || !period || !userId) {
            return res.status(400).json({
                message: "Invalid order metadata",
            });
        }
        /* ==========================
           3️⃣ CALCULATE RENEWAL DATE
        ========================== */
        const now = new Date();
        const renewalDate = new Date(now);
        switch (period) {
            case "monthly":
                renewalDate.setMonth(now.getMonth() + 1);
                break;
            case "6months":
                renewalDate.setMonth(now.getMonth() + 6);
                break;
            case "1year":
                renewalDate.setFullYear(now.getFullYear() + 1);
                break;
        }
        /* ==========================
           4️⃣ UPDATE USER
        ========================== */
        await db_1.db
            .update(schema_1.users)
            .set({
            planType,
            subscriptionDuration: period,
            renewalDate,
            accountStatus: "pending_approval",
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        return res.json({
            success: true,
            message: "Payment verified successfully",
        });
    }
    catch (error) {
        return res.status(400).json({
            message: error?.message || "Failed to verify payment",
        });
    }
});
exports.default = router;
