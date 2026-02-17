"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().optional(),
    DATABASE_URL: zod_1.z.string().url(),
    JWT_SECRET: zod_1.z.string().min(10, "JWT_SECRET must be at least 10 characters"),
    RAZORPAY_KEY_ID: zod_1.z.string().min(1),
    RAZORPAY_KEY_SECRET: zod_1.z.string().min(1),
    ADMIN_EMAIL: zod_1.z.string().email().optional(),
    ADMIN_PASSWORD: zod_1.z.string().min(6).optional(),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment variables", parsed.error.format());
    throw new Error("Invalid environment variables");
}
const env = parsed.data;
exports.config = {
    port: Number(env.PORT) || 4000,
    databaseUrl: env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET,
    razorpayKeyId: env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET || "",
    adminEmail: env.ADMIN_EMAIL || "admin@morex.com",
    adminPassword: env.ADMIN_PASSWORD || "admin123456",
};
