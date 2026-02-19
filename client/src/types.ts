export type Role = "admin" | "user";
export type PlanType = "basic" | "pro";
export type SubscriptionDuration =
  | "monthly"
  | "6months"
  | "1year";
export type AccountStatus =
  | "pending_payment"
  | "pending_approval"
  | "active"
  | "disabled";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  // New subscription fields
  mobile?: string;
  companyName?: string;
  companyAddress?: string;
  domain?: string;
  databaseUrl?: string;
  numberOfUsers?: number;
  planType?: PlanType;
  subscriptionDuration?: SubscriptionDuration;
  accountStatus: AccountStatus;
  paymentBaseAmount?: string | number | null;
  paymentDiscountAmount?: string | number | null;
  paymentGstAmount?: string | number | null;
  paymentFinalAmount?: string | number | null;
  paymentStatus?: "pending" | "completed";
  renewalDate?: string;
}
