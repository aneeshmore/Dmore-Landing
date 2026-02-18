import { api } from "../api/client";
import type { PlanType, SubscriptionDuration } from "../types";

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export interface PaymentStatusResponse {
  paymentStatus: "Pending" | "Completed" | "Failed";
}

export interface CreateOrderParams {
  planType: PlanType;
  period: SubscriptionDuration;
  couponCode?: string;
}

export const paymentService = {
  /**
   * Create a Razorpay order
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    const { data } = await api.post("/payments/create-order", params);
    return data;
  },

  /**
   * Verify payment with Razorpay
   */
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<VerifyPaymentResponse> {
    const { data } = await api.post("/payments/verify-payment", {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return data;
  },

  async getPaymentStatus(): Promise<PaymentStatusResponse> {
    const { data } = await api.get("/user/status");
    return data;
  },
};

// Pricing data aligned with backend
export const PRICING = {
  basic: {
    monthly: { amount: 1499, label: "Monthly" },
    "6months": { amount: 7999, label: "6 Months" },
    "1year": { amount: 14999, label: "1 Year" },
  },
  pro: {
    monthly: { amount: 4999, label: "Monthly" },
    "6months": { amount: 26999, label: "6 Months" },
    "1year": { amount: 49999, label: "1 Year" },
  },
};

export type PlanPeriod = keyof typeof PRICING.basic;
