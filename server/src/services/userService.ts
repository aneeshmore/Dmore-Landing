import { eq } from "drizzle-orm";
import { db } from "../db";
import { NewUser, User, users } from "../db/schema";
import { hashPassword, verifyPassword } from "../utils/password";
import { config } from "../config/env";



export const findUserByEmail = async (email: string) => {
  try {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
};

export const findUserByMobile = async (mobile: string) => {
  try {
    return await db.query.users.findFirst({
      where: eq(users.mobile, mobile),
    });
  } catch (error) {
    console.error("Database query failed:", error);
    return null;
  }
};

export const findUserById = async (id: number) => {
  try {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
    });
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
      .returning();
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isLegacyAccountStatusError =
      message.includes("account_status") && message.includes("pending_payment");

    if (!isLegacyAccountStatusError) {
      throw error;
    }

    const { accountStatus, ...fallbackInput } = input as NewUser;
    const [fallbackUser] = await db
      .insert(users)
      .values({ ...fallbackInput, password })
      .returning();
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
    return await db.query.users.findMany({
      columns: {
        password: false,
      },
    });
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
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      mobile: users.mobile,
      companyName: users.companyName,
      companyAddress: users.companyAddress,
      role: users.role,
      domain: users.domain,
      databaseUrl: users.databaseUrl,
      numberOfUsers: users.numberOfUsers,
      planType: users.planType,
      subscriptionDuration: users.subscriptionDuration,
      accountStatus: users.accountStatus,
      renewalDate: users.renewalDate,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return user;
};

export const deleteUser = async (id: number) => {
  return db.delete(users).where(eq(users.id, id));
};
