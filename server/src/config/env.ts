import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(6).optional(),
  ERP_API_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables", parsed.error.format());
  throw new Error("Invalid environment variables");
}

const env = parsed.data;

export const config = {
  port: Number(env.PORT) || 4000,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  razorpayKeyId: env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: env.RAZORPAY_KEY_SECRET || "",
  adminEmail: env.ADMIN_EMAIL || "admin@morex.com",
  adminPassword: env.ADMIN_PASSWORD || "admin123456",
  erpApiUrl: env.ERP_API_URL || "http://localhost:5000/api/v1",
  webhookSecret: env.WEBHOOK_SECRET || "morex_super_secret_webhook_key_2026",
};
