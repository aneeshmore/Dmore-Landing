"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactions = exports.plans = exports.users = exports.accountStatusEnum = exports.subscriptionDurationEnum = exports.planTypeEnum = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.roleEnum = (0, pg_core_1.pgEnum)("role", ["admin", "user"]);
exports.planTypeEnum = (0, pg_core_1.pgEnum)("plan_type", ["basic", "pro"]);
exports.subscriptionDurationEnum = (0, pg_core_1.pgEnum)("subscription_duration", [
    "monthly",
    "6months",
    "1year",
]);
exports.accountStatusEnum = (0, pg_core_1.pgEnum)("account_status", [
    "pending_payment",
    "pending_approval",
    "active",
    "disabled",
]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    name: (0, pg_core_1.text)("name").notNull(),
    password: (0, pg_core_1.text)("password").notNull(),
    mobile: (0, pg_core_1.text)("mobile"),
    companyName: (0, pg_core_1.text)("company_name"),
    companyAddress: (0, pg_core_1.text)("company_address"),
    role: (0, exports.roleEnum)("role").notNull().default("user"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    // New subscription fields
    domain: (0, pg_core_1.text)("domain"),
    databaseUrl: (0, pg_core_1.text)("database_url"),
    numberOfUsers: (0, pg_core_1.integer)("number_of_users").default(1),
    planType: (0, exports.planTypeEnum)("plan_type"),
    subscriptionDuration: (0, exports.subscriptionDurationEnum)("subscription_duration").default("monthly"),
    accountStatus: (0, exports.accountStatusEnum)("account_status")
        .default("pending_payment")
        .notNull(),
    paymentBaseAmount: (0, pg_core_1.numeric)("payment_base_amount", {
        precision: 12,
        scale: 2,
    }),
    paymentDiscountAmount: (0, pg_core_1.numeric)("payment_discount_amount", {
        precision: 12,
        scale: 2,
    }),
    paymentGstAmount: (0, pg_core_1.numeric)("payment_gst_amount", {
        precision: 12,
        scale: 2,
    }),
    paymentFinalAmount: (0, pg_core_1.numeric)("payment_final_amount", {
        precision: 12,
        scale: 2,
    }),
    renewalDate: (0, pg_core_1.timestamp)("renewal_date", { withTimezone: true }),
    couponCode: (0, pg_core_1.text)("coupon_code"),
    couponDiscountAmount: (0, pg_core_1.numeric)("coupon_discount_amount", { precision: 12, scale: 2 }),
    couponCreatedAt: (0, pg_core_1.timestamp)("coupon_created_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date()),
});
exports.plans = (0, pg_core_1.pgTable)("plans", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    planType: (0, pg_core_1.text)("plan_type").unique().notNull(), // basic | pro
    monthlyPrice: (0, pg_core_1.numeric)("monthly_price", { precision: 12, scale: 2 }).notNull(),
    sixMonthPrice: (0, pg_core_1.numeric)("six_month_price", { precision: 12, scale: 2 }).notNull(),
    yearlyPrice: (0, pg_core_1.numeric)("yearly_price", { precision: 12, scale: 2 }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date()),
});
exports.transactions = (0, pg_core_1.pgTable)("transactions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id")
        .references(() => exports.users.id, { onDelete: "cascade" })
        .notNull(),
    planType: (0, pg_core_1.text)("plan_type").notNull(),
    period: (0, pg_core_1.text)("period").notNull(),
    baseAmount: (0, pg_core_1.numeric)("base_amount", { precision: 12, scale: 2 }).notNull(),
    discountAmount: (0, pg_core_1.numeric)("discount_amount", { precision: 12, scale: 2 }).default("0"),
    gstAmount: (0, pg_core_1.numeric)("gst_amount", { precision: 12, scale: 2 }).notNull(),
    finalAmount: (0, pg_core_1.numeric)("final_amount", { precision: 12, scale: 2 }).notNull(),
    razorpayOrderId: (0, pg_core_1.text)("razorpay_order_id"),
    razorpayPaymentId: (0, pg_core_1.text)("razorpay_payment_id"),
    couponUsed: (0, pg_core_1.text)("coupon_used"),
    status: (0, pg_core_1.text)("status").notNull().default("completed"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
});
