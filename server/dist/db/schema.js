"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.accountStatusEnum = exports.subscriptionDurationEnum = exports.planTypeEnum = exports.roleEnum = void 0;
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
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date()),
});
