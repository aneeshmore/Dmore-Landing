"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.listUsers = exports.authenticateUser = exports.createUser = exports.findUserById = exports.findUserByEmail = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const password_1 = require("../utils/password");
const findUserByEmail = (email) => db_1.db.query.users.findFirst({
    where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
});
exports.findUserByEmail = findUserByEmail;
const findUserById = (id) => db_1.db.query.users.findFirst({
    where: (0, drizzle_orm_1.eq)(schema_1.users.id, id),
});
exports.findUserById = findUserById;
const createUser = async (input) => {
    const existing = await (0, exports.findUserByEmail)(input.email);
    if (existing) {
        throw new Error("Email already in use");
    }
    const password = await (0, password_1.hashPassword)(input.password);
    const [user] = await db_1.db
        .insert(schema_1.users)
        .values({ ...input, password })
        .returning();
    return user;
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
const listUsers = () => db_1.db.query.users.findMany({
    columns: {
        password: false,
    },
});
exports.listUsers = listUsers;
const updateUser = async (id, data) => {
    // ✅ FIX: Email uniqueness check moved inside function
    if (data.email) {
        const existing = await (0, exports.findUserByEmail)(data.email);
        if (existing && existing.id !== id) {
            throw new Error("Email already in use");
        }
    }
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
        .returning({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        isActive: schema_1.users.isActive,
        mobile: schema_1.users.mobile,
        companyName: schema_1.users.companyName,
        companyAddress: schema_1.users.companyAddress,
        role: schema_1.users.role,
        domain: schema_1.users.domain,
        numberOfUsers: schema_1.users.numberOfUsers,
        planType: schema_1.users.planType,
        subscriptionDuration: schema_1.users.subscriptionDuration,
        accountStatus: schema_1.users.accountStatus,
        renewalDate: schema_1.users.renewalDate,
        createdAt: schema_1.users.createdAt,
        updatedAt: schema_1.users.updatedAt,
    });
    return user;
};
exports.updateUser = updateUser;
const deleteUser = async (id) => {
    return db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
};
exports.deleteUser = deleteUser;
