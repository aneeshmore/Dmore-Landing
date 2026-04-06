import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "user"]);
export const planTypeEnum = pgEnum("plan_type", ["basic", "pro"]);
export const subscriptionDurationEnum = pgEnum("subscription_duration", [
  "monthly",
  "6months",
  "1year",
]);
export const accountStatusEnum = pgEnum("account_status", [
  "pending_payment",
  "pending_approval",
  "active",
  "disabled",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),

  name: text("name").notNull(),
  password: text("password").notNull(),
  mobile: text("mobile"),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  role: roleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  // New subscription fields
  domain: text("domain"),
  databaseUrl: text("database_url"),
  numberOfUsers: integer("number_of_users").default(1),
  planType: planTypeEnum("plan_type"),

  subscriptionDuration: subscriptionDurationEnum(
    "subscription_duration",
  ).default("monthly"),
  accountStatus: accountStatusEnum("account_status")
    .default("pending_payment")
    .notNull(),

  paymentBaseAmount: numeric("payment_base_amount", {
    precision: 12,
    scale: 2,
  }),
  paymentDiscountAmount: numeric("payment_discount_amount", {
    precision: 12,
    scale: 2,
  }),
  paymentGstAmount: numeric("payment_gst_amount", {
    precision: 12,
    scale: 2,
  }),
  paymentFinalAmount: numeric("payment_final_amount", {
    precision: 12,
    scale: 2,
  }),

  renewalDate: timestamp("renewal_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});


export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  planType: text("plan_type").unique().notNull(), // basic | pro
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }).notNull(),
  sixMonthPrice: numeric("six_month_price", { precision: 12, scale: 2 }).notNull(),
  yearlyPrice: numeric("yearly_price", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Plan = InferSelectModel<typeof plans>;
export type NewPlan = InferInsertModel<typeof plans>;
