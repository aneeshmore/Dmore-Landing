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
        "6months": 7999,
        "1year": 14999,
    },
    pro: {
        monthly: 4999,
        "6months": 26999,
        "1year": 49999,
    },
};
const COUPON_CODE = "coloursociety";
const COUPON_DISCOUNT = 2000;
const GST_RATE = 0.18;
const roundToTwo = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const isMissingPaymentColumnError = (error) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (message.includes("payment_base_amount") ||
        message.includes("payment_discount_amount") ||
        message.includes("payment_gst_amount") ||
        message.includes("payment_final_amount"));
};
const calculatePaymentBreakdown = (baseAmount, applyCoupon) => {
    const discountAmount = applyCoupon ? COUPON_DISCOUNT : 0;
    const discountedAmount = Math.max(baseAmount - discountAmount, 0);
    const gstAmount = roundToTwo(discountedAmount * GST_RATE);
    const finalAmount = roundToTwo(discountedAmount + gstAmount);
    return {
        baseAmount,
        discountAmount,
        gstAmount,
        finalAmount,
        amountInPaise: Math.round(finalAmount * 100),
    };
};
const toPaymentStatus = (user) => {
    if (user.accountStatus === "disabled")
        return "Failed";
    if (user.accountStatus === "pending_payment")
        return "Pending";
    if (user.accountStatus === "pending_approval")
        return "Completed";
    // Legacy DB compatibility: "active" was historical default.
    if (user.accountStatus === "active") {
        return user.renewalDate ? "Completed" : "Pending";
    }
    return "Pending";
};
/* ==========================
   VALIDATION SCHEMA
========================== */
const createOrderSchema = zod_1.z.object({
    planType: zod_1.z.enum(["basic", "pro"]),
    period: zod_1.z.enum(["monthly", "6months", "1year"]),
    couponCode: zod_1.z.string().optional(),
    clientFinalAmount: zod_1.z.number().finite().nonnegative().optional(),
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
        const { planType, period, couponCode, clientFinalAmount } = createOrderSchema.parse(req.body);
        const requestingUser = await (0, userService_1.findUserById)(req.user.userId);
        if (!requestingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        const paymentStatus = toPaymentStatus(requestingUser);
        if (requestingUser.role === "user" && paymentStatus !== "Pending") {
            return res.status(403).json({
                paymentStatus,
                message: paymentStatus === "Completed"
                    ? "Payment successful. Admin will contact you soon."
                    : "Payment failed. Please try again.",
            });
        }
        const amount = pricing[planType][period];
        if (!amount) {
            return res.status(400).json({
                message: "Invalid pricing configuration",
            });
        }
        const normalizedCoupon = couponCode?.trim().toLowerCase();
        const isCouponApplicable = period === "1year" && normalizedCoupon === COUPON_CODE;
        const { baseAmount, discountAmount, gstAmount, finalAmount, amountInPaise, } = calculatePaymentBreakdown(amount, isCouponApplicable);
        if (typeof clientFinalAmount === "number" &&
            roundToTwo(clientFinalAmount) !== roundToTwo(finalAmount)) {
            return res.status(400).json({
                message: "Final amount mismatch. Please refresh and try again.",
            });
        }
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                planType,
                period,
                userId: String(req.user.userId),
                couponApplied: isCouponApplicable ? "true" : "false",
                baseAmount: baseAmount.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                gstAmount: gstAmount.toFixed(2),
                finalAmount: finalAmount.toFixed(2),
            },
        });
        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: env_1.config.razorpayKeyId,
            baseAmount,
            discountAmount,
            gstAmount,
            finalAmount,
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
router.get("/status", auth_1.authenticate, async (req, res) => {
    const user = await (0, userService_1.findUserById)(req.user.userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    return res.json({ paymentStatus: toPaymentStatus(user) });
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
        const couponApplied = notes.couponApplied === "true";
        const userId = Number(notes.userId);
        const notedBaseAmount = Number(notes.baseAmount);
        const notedDiscountAmount = Number(notes.discountAmount);
        const notedGstAmount = Number(notes.gstAmount);
        const notedFinalAmount = Number(notes.finalAmount);
        if (!planType || !period || !userId) {
            return res.status(400).json({
                message: "Invalid order metadata",
            });
        }
        const baseAmount = pricing[planType][period];
        const canApplyCoupon = period === "1year";
        const { discountAmount, gstAmount, finalAmount, amountInPaise: expectedAmountInPaise, } = calculatePaymentBreakdown(baseAmount, couponApplied && canApplyCoupon);
        if (order.amount !== expectedAmountInPaise) {
            return res.status(400).json({
                message: "Order amount mismatch for selected plan",
            });
        }
        if (Number.isFinite(notedBaseAmount) &&
            Number.isFinite(notedDiscountAmount) &&
            Number.isFinite(notedGstAmount) &&
            Number.isFinite(notedFinalAmount)) {
            if (roundToTwo(notedBaseAmount) !== roundToTwo(baseAmount) ||
                roundToTwo(notedDiscountAmount) !== roundToTwo(discountAmount) ||
                roundToTwo(notedGstAmount) !== roundToTwo(gstAmount) ||
                roundToTwo(notedFinalAmount) !== roundToTwo(finalAmount)) {
                return res.status(400).json({
                    message: "Stored payment breakdown mismatch",
                });
            }
        }
        const payment = await razorpay.payments.fetch(razorpayPaymentId);
        if (payment.amount !== expectedAmountInPaise) {
            return res.status(400).json({
                message: "Paid amount mismatch for selected plan",
            });
        }
        if (req.user?.userId !== userId) {
            return res.status(403).json({
                message: "Payment verification user mismatch",
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
        try {
            await db_1.db
                .update(schema_1.users)
                .set({
                planType,
                subscriptionDuration: period,
                renewalDate,
                accountStatus: "active",
                paymentBaseAmount: baseAmount.toFixed(2),
                paymentDiscountAmount: discountAmount.toFixed(2),
                paymentGstAmount: gstAmount.toFixed(2),
                paymentFinalAmount: finalAmount.toFixed(2),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        }
        catch (error) {
            if (!isMissingPaymentColumnError(error)) {
                throw error;
            }
            await db_1.db
                .update(schema_1.users)
                .set({
                planType,
                subscriptionDuration: period,
                renewalDate,
                accountStatus: "active",
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        }
        // Record transaction
        try {
            await db_1.db.insert(schema_1.transactions).values({
                userId,
                planType,
                period,
                baseAmount: baseAmount.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                gstAmount: gstAmount.toFixed(2),
                finalAmount: finalAmount.toFixed(2),
                razorpayOrderId,
                razorpayPaymentId,
                couponUsed: couponApplied ? (notes.couponCode || "coloursociety") : null,
                status: "completed",
            });
        }
        catch (logErr) {
            console.error("Failed to log transaction:", logErr);
            // Don't fail the verification if logging fails, but it's important
        }
        return res.json({
            success: true,
            message: "Payment verified successfully",
            paymentDetails: {
                baseAmount,
                discountAmount,
                gstAmount,
                finalAmount,
                finalPaidAmount: roundToTwo(payment.amount / 100),
            },
        });
    }
    catch (error) {
        return res.status(400).json({
            message: error?.message || "Failed to verify payment",
        });
    }
});
exports.default = router;
