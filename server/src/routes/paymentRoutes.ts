import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config/env";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { z, ZodError } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/* ==========================
   RAZORPAY INSTANCE
========================== */

const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret,
});

const hasPlaceholderRazorpayKeys = () =>
  /dummy|your_.*key/i.test(config.razorpayKeyId) ||
  /dummy|your_.*secret/i.test(config.razorpayKeySecret);

const getRazorpayErrorMessage = (error: unknown) => {
  const err = error as any;
  return (
    err?.error?.description ||
    err?.description ||
    err?.error?.reason ||
    err?.reason ||
    err?.message ||
    "Failed to create order"
  );
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
} as const;

type PlanType = keyof typeof pricing;
type PlanPeriod = keyof (typeof pricing)["basic"];

/* ==========================
   VALIDATION SCHEMA
========================== */

const createOrderSchema = z.object({
  planType: z.enum(["basic", "pro"]),
  period: z.enum(["monthly", "6months", "1year"]),
});

/* ==========================
   CREATE ORDER
========================== */

router.post(
  "/create-order",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (hasPlaceholderRazorpayKeys()) {
        return res.status(500).json({
          message:
            "Razorpay keys are not configured. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.",
        });
      }

      const { planType, period } = createOrderSchema.parse(req.body);

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
          userId: String(req.user!.userId),
        },
      });

      return res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: config.razorpayKeyId,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid create-order payload",
          issues: error.issues,
        });
      }

      const statusCode =
        typeof error?.statusCode === "number" ? error.statusCode : 400;
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
  },
);

/* ==========================
   VERIFY PAYMENT
========================== */

router.post(
  "/verify-payment",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        req.body as {
          razorpayOrderId: string;
          razorpayPaymentId: string;
          razorpaySignature: string;
        };

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({
          message: "Missing payment details",
        });
      }

      /* ==========================
         1️⃣ VERIFY SIGNATURE
      ========================== */

      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;

      const expectedSignature = crypto
        .createHmac("sha256", config.razorpayKeySecret)
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

      const notes = order.notes as Record<string, string> | undefined;

      if (!notes) {
        return res.status(400).json({
          message: "Order notes missing",
        });
      }

      const planType = notes.planType as PlanType;
      const period = notes.period as PlanPeriod;
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

      await db
        .update(users)
        .set({
          planType,
          subscriptionDuration: period,
          renewalDate,
          accountStatus: "pending_approval",
        })
        .where(eq(users.id, userId));

      return res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } catch (error: any) {
      return res.status(400).json({
        message: error?.message || "Failed to verify payment",
      });
    }
  },
);

export default router;
