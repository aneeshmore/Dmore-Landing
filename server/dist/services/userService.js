"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.listUsers = exports.authenticateUser = exports.createUser = exports.findUserById = exports.findUserByMobile = exports.findUserByEmail = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const password_1 = require("../utils/password");
const env_1 = require("../config/env");
const tenantRegistrationService_1 = require("./tenantRegistrationService");
const authSafeUserSelection = {
    id: schema_1.users.id,
    email: schema_1.users.email,
    name: schema_1.users.name,
    password: schema_1.users.password,
    mobile: schema_1.users.mobile,
    companyName: schema_1.users.companyName,
    companyAddress: schema_1.users.companyAddress,
    role: schema_1.users.role,
    isActive: schema_1.users.isActive,
    domain: schema_1.users.domain,
    databaseUrl: schema_1.users.databaseUrl,
    numberOfUsers: schema_1.users.numberOfUsers,
    planType: schema_1.users.planType,
    subscriptionDuration: schema_1.users.subscriptionDuration,
    accountStatus: schema_1.users.accountStatus,
    renewalDate: schema_1.users.renewalDate,
    couponCode: schema_1.users.couponCode,
    couponDiscountAmount: schema_1.users.couponDiscountAmount,
    couponCreatedAt: schema_1.users.couponCreatedAt,
    createdAt: schema_1.users.createdAt,
    updatedAt: schema_1.users.updatedAt,
};
const listUserSelection = {
    id: schema_1.users.id,
    email: schema_1.users.email,
    name: schema_1.users.name,
    mobile: schema_1.users.mobile,
    companyName: schema_1.users.companyName,
    companyAddress: schema_1.users.companyAddress,
    role: schema_1.users.role,
    isActive: schema_1.users.isActive,
    domain: schema_1.users.domain,
    databaseUrl: schema_1.users.databaseUrl,
    numberOfUsers: schema_1.users.numberOfUsers,
    planType: schema_1.users.planType,
    subscriptionDuration: schema_1.users.subscriptionDuration,
    accountStatus: schema_1.users.accountStatus,
    renewalDate: schema_1.users.renewalDate,
    couponCode: schema_1.users.couponCode,
    couponDiscountAmount: schema_1.users.couponDiscountAmount,
    couponCreatedAt: schema_1.users.couponCreatedAt,
    createdAt: schema_1.users.createdAt,
    updatedAt: schema_1.users.updatedAt,
};
const findUserByEmail = async (email) => {
    try {
        const [user] = await db_1.db
            .select(authSafeUserSelection)
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1);
        return user ?? null;
    }
    catch (error) {
        console.error("Database query failed:", error);
        return null;
    }
};
exports.findUserByEmail = findUserByEmail;
const findUserByMobile = async (mobile) => {
    try {
        const [user] = await db_1.db
            .select(authSafeUserSelection)
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.mobile, mobile))
            .limit(1);
        return user ?? null;
    }
    catch (error) {
        console.error("Database query failed:", error);
        return null;
    }
};
exports.findUserByMobile = findUserByMobile;
const findUserById = async (id) => {
    try {
        const [user] = await db_1.db
            .select(authSafeUserSelection)
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
            .limit(1);
        return user ?? null;
    }
    catch (error) {
        console.error("Database query failed:", error);
        return null;
    }
};
exports.findUserById = findUserById;
const createUser = async (input) => {
    const existing = await (0, exports.findUserByEmail)(input.email);
    if (existing) {
        throw new Error("User already registered.");
    }
    if (input.mobile) {
        const existingMobile = await (0, exports.findUserByMobile)(input.mobile);
        if (existingMobile) {
            throw new Error("User already registered.");
        }
    }
    const password = await (0, password_1.hashPassword)(input.password);
    try {
        const [user] = await db_1.db
            .insert(schema_1.users)
            .values({ ...input, password })
            .returning(authSafeUserSelection);
        return user;
    }
    catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        const isLegacyAccountStatusError = message.includes("account_status") && message.includes("pending_payment");
        const isMissingPaymentColumnError = message.includes("payment_base_amount") ||
            message.includes("payment_discount_amount") ||
            message.includes("payment_gst_amount") ||
            message.includes("payment_final_amount");
        if (!isLegacyAccountStatusError && !isMissingPaymentColumnError) {
            throw error;
        }
        if (isMissingPaymentColumnError) {
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        insert into "users"
          ("email", "name", "password", "mobile", "company_name", "company_address", "role", "is_active")
        values
          (${input.email}, ${input.name}, ${password}, ${input.mobile ?? null}, ${input.companyName ?? null}, ${input.companyAddress ?? null}, ${input.role ?? "user"}, ${input.isActive ?? true})
      `);
            const inserted = await (0, exports.findUserByEmail)(input.email);
            if (!inserted) {
                throw new Error("Registration failed. Please try again.");
            }
            return inserted;
        }
        const { accountStatus, ...fallbackInput } = input;
        const [fallbackUser] = await db_1.db
            .insert(schema_1.users)
            .values({ ...fallbackInput, password })
            .returning(authSafeUserSelection);
        return fallbackUser;
    }
};
exports.createUser = createUser;
const authenticateUser = async (email, password) => {
    const user = await (0, exports.findUserByEmail)(email);
    if (!user || !user.isActive)
        return null;
    const isValid = await (0, password_1.verifyPassword)(password, user.password);
    if (!isValid)
        return null;
    return user;
};
exports.authenticateUser = authenticateUser;
const listUsers = async () => {
    try {
        return await db_1.db.select(listUserSelection).from(schema_1.users);
    }
    catch (error) {
        console.error("Could not fetch users from database:", error);
        return [];
    }
};
exports.listUsers = listUsers;
const updateUser = async (id, data) => {
    // ✅ FIX: Email uniqueness check moved inside function
    if (data.email) {
        const existing = await (0, exports.findUserByEmail)(data.email);
        if (existing && existing.id !== id) {
            throw new Error("Email already in use");
        }
    }
    const oldUser = await (0, exports.findUserById)(id);
    const updatePayload = { ...data };
    if (data.password) {
        updatePayload.password = await (0, password_1.hashPassword)(data.password);
    }
    if (Object.keys(updatePayload).length === 0) {
        const [existing] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return existing;
    }
    const [user] = await db_1.db
        .update(schema_1.users)
        .set(updatePayload)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
        .returning(listUserSelection);
    // Trigger ERP Webhook or Tenant Registration if plan, domain, or active status is updated
    if ((data.planType || data.domain || data.isActive !== undefined) && user.domain && user.planType) {
        triggerERPWebhook(user.domain, user.planType, user.isActive ?? true).catch((err) => console.error("Failed to trigger ERP webhook:", err));
    }
    // Handle Domain or Database URL update
    if ((data.domain || data.databaseUrl) && oldUser) {
        const domainChanged = data.domain && data.domain !== oldUser.domain;
        const dbUrlChanged = data.databaseUrl && data.databaseUrl !== oldUser.databaseUrl;
        if (domainChanged || dbUrlChanged) {
            const tenantId = user.domain?.split(".")[0];
            if (tenantId && user.databaseUrl) {
                (0, tenantRegistrationService_1.runTenantRegistration)(tenantId, user.databaseUrl).catch((err) => console.error(`Failed to trigger background registration for ${tenantId}:`, err));
            }
        }
    }
    return user;
};
exports.updateUser = updateUser;
const triggerERPWebhook = async (subdomain, planType, isActive = true) => {
    if (!env_1.config.erpApiUrl || !env_1.config.webhookSecret) {
        console.warn("ERP Webhook skipped: Missing configuration");
        return;
    }
    try {
        const response = await fetch(`${env_1.config.erpApiUrl}/webhooks/subscription/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                secret: env_1.config.webhookSecret,
            },
            body: JSON.stringify({ subdomain, planType, isActive }),
        });
        if (!response.ok) {
            console.error(`ERP Webhook failed with status: ${response.status}`);
            const text = await response.text();
            console.error("Response:", text);
        }
        else {
            console.log(`ERP Webhook success: Updated plan for ${subdomain} to ${planType}`);
        }
    }
    catch (error) {
        console.error("Error triggering ERP webhook:", error);
    }
};
const deleteUser = async (id) => {
    return db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
};
exports.deleteUser = deleteUser;
