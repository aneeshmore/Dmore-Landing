import { eq } from "drizzle-orm";
import { db } from "../db";
import { NewUser, User, users } from "../db/schema";
import { hashPassword, verifyPassword } from "../utils/password";

export const findUserByEmail = (email: string) =>
  db.query.users.findFirst({
    where: eq(users.email, email),
  });

export const findUserById = (id: number) =>
  db.query.users.findFirst({
    where: eq(users.id, id),
  });

export const createUser = async (
  input: Omit<NewUser, "id" | "createdAt" | "updatedAt">,
) => {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("Email already in use");
  }

  const password = await hashPassword(input.password!);
  const [user] = await db
    .insert(users)
    .values({ ...input, password })
    .returning();

  return user;
};

export const authenticateUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return user;
};

export const listUsers = () =>
  db.query.users.findMany({
    columns: {
      password: false,
    },
  });

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
