import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { NewUser, users, type User } from "../db/schema";
import { hashPassword, verifyPassword } from "../utils/password";
import { config } from "../config/env";
import { runTenantRegistration } from "./tenantRegistrationService";

const authSafeUserSelection = {
  id: users.id,
  email: users.email,
  name: users.name,
  password: users.password,
  mobile: users.mobile,
  companyName: users.companyName,
  companyAddress: users.companyAddress,
  role: users.role,
  isActive: users.isActive,
  domain: users.domain,
  databaseUrl: users.databaseUrl,
  numberOfUsers: users.numberOfUsers,
  planType: users.planType,
  subscriptionDuration: users.subscriptionDuration,
  accountStatus: users.accountStatus,
  renewalDate: users.renewalDate,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const listUserSelection = {
  id: users.id,
  email: users.email,
  name: users.name,
  mobile: users.mobile,
  companyName: users.companyName,
  companyAddress: users.companyAddress,
  role: users.role,
  isActive: users.isActive,
  domain: users.domain,
  databaseUrl: users.databaseUrl,
  numberOfUsers: users.numberOfUsers,
  planType: users.planType,
  subscriptionDuration: users.subscriptionDuration,
  accountStatus: users.accountStatus,
  renewalDate: users.renewalDate,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const findUserByEmail = async (email: string) => {
  try {
    const [user] = await db
      .select(authSafeUserSelection)
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user ?? null;
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
};

export const findUserByMobile = async (mobile: string) => {
  try {
    const [user] = await db
      .select(authSafeUserSelection)
      .from(users)
      .where(eq(users.mobile, mobile))
      .limit(1);
    return user ?? null;
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
};

export const findUserById = async (id: number) => {
  try {
    const [user] = await db
      .select(authSafeUserSelection)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
};

export const createUser = async (
  input: Omit<NewUser, "id" | "createdAt" | "updatedAt">,
) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("User already registered.");
  }

  if (input.mobile) {
    const existingMobile = await findUserByMobile(input.mobile);
    if (existingMobile) {
      throw new Error("User already registered.");
    }
  }

  const password = await hashPassword(input.password!);

  try {
    const [user] = await db
      .insert(users)
      .values({ ...input, password })
      .returning(authSafeUserSelection);
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isLegacyAccountStatusError =
      message.includes("account_status") && message.includes("pending_payment");
    const isMissingPaymentColumnError =
      message.includes("payment_base_amount") ||
      message.includes("payment_discount_amount") ||
      message.includes("payment_gst_amount") ||
      message.includes("payment_final_amount");

    if (!isLegacyAccountStatusError && !isMissingPaymentColumnError) {
      throw error;
    }

    if (isMissingPaymentColumnError) {
      await db.execute(sql`
        insert into "users"
          ("email", "name", "password", "mobile", "company_name", "company_address", "role", "is_active")
        values
          (${input.email}, ${input.name}, ${password}, ${input.mobile ?? null}, ${input.companyName ?? null}, ${input.companyAddress ?? null}, ${input.role ?? "user"}, ${input.isActive ?? true})
      `);

      const inserted = await findUserByEmail(input.email);
      if (!inserted) {
        throw new Error("Registration failed. Please try again.");
      }
      return inserted;
    }

    const { accountStatus, ...fallbackInput } = input as NewUser;
    const [fallbackUser] = await db
      .insert(users)
      .values({ ...fallbackInput, password })
      .returning(authSafeUserSelection);
    return fallbackUser;
  }
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return user;
};

export const listUsers = async () => {
  try {
    return await db.select(listUserSelection).from(users);
  } catch (error) {
    console.error("Could not fetch users from database:", error);
    return [];
  }
};

// Extended type for update that includes all user fields including subscription fields
export type UpdateUserInput = Partial<
  Pick<
    User,
    | "name"
    | "email"
    | "isActive"
    | "mobile"
    | "companyName"
    | "companyAddress"
    | "role"
    | "domain"
    | "databaseUrl"
    | "numberOfUsers"
    | "planType"
    | "subscriptionDuration"
    | "accountStatus"
    | "paymentBaseAmount"
    | "paymentDiscountAmount"
    | "paymentGstAmount"
    | "paymentFinalAmount"
    | "renewalDate"
  >
> & { password?: string };

export const updateUser = async (id: number, data: UpdateUserInput) => {
  // ✅ FIX: Email uniqueness check moved inside function
  if (data.email) {
    const existing = await findUserByEmail(data.email);
    if (existing && existing.id !== id) {
      throw new Error("Email already in use");
    }
  }

  const oldUser = await findUserById(id);
  const updatePayload: Record<string, unknown> = { ...data };

  if (data.password) {
    updatePayload.password = await hashPassword(data.password);
  }

  if (Object.keys(updatePayload).length === 0) {
    const [existing] = await db.select().from(users).where(eq(users.id, id));
    return existing;
  }

  const [user] = await db
    .update(users)
    .set(updatePayload)
    .where(eq(users.id, id))
    .returning(listUserSelection);

  // Trigger ERP Webhook or Tenant Registration if plan or domain is updated
  if ((data.planType || data.domain) && user.domain && user.planType) {
    triggerERPWebhook(user.domain, user.planType).catch((err) =>
      console.error("Failed to trigger ERP webhook:", err),
    );
  }

  // Handle Domain or Database URL update
  if ((data.domain || data.databaseUrl) && oldUser) {
    const domainChanged = data.domain && data.domain !== oldUser.domain;
    const dbUrlChanged = data.databaseUrl && data.databaseUrl !== oldUser.databaseUrl;

    if (domainChanged || dbUrlChanged) {
      const tenantId = user.domain?.split(".")[0];
      if (tenantId && user.databaseUrl) {
        runTenantRegistration(tenantId, user.databaseUrl).catch((err) =>
          console.error(`Failed to trigger background registration for ${tenantId}:`, err)
        );
      }
    }
  }

  return user;
};

const triggerERPWebhook = async (subdomain: string, planType: string) => {
  if (!config.erpApiUrl || !config.webhookSecret) {
    console.warn("ERP Webhook skipped: Missing configuration");
    return;
  }

  try {
    const response = await fetch(
      `${config.erpApiUrl}/webhooks/subscription/update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          secret: config.webhookSecret,
        },
        body: JSON.stringify({ subdomain, planType }),
      },
    );

    if (!response.ok) {
      console.error(`ERP Webhook failed with status: ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);
    } else {
      console.log(
        `ERP Webhook success: Updated plan for ${subdomain} to ${planType}`,
      );
    }
  } catch (error) {
    console.error("Error triggering ERP webhook:", error);
  }
};

export const deleteUser = async (id: number) => {
  return db.delete(users).where(eq(users.id, id));
};
