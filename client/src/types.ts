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
  numberOfUsers?: number;
  planType?: PlanType;
  subscriptionDuration?: SubscriptionDuration;
  accountStatus: AccountStatus;
  renewalDate?: string;
}
