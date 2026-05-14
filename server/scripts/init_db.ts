import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log("Checking DB...");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS "transactions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "plan_type" text NOT NULL,
      "period" text NOT NULL,
      "base_amount" numeric(12, 2) NOT NULL,
      "discount_amount" numeric(12, 2) DEFAULT '0',
      "gst_amount" numeric(12, 2) NOT NULL,
      "final_amount" numeric(12, 2) NOT NULL,
      "razorpay_order_id" text,
      "razorpay_payment_id" text,
      "coupon_used" text,
      "status" text DEFAULT 'completed' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now()
    );`);
    
    console.log("Adding columns...");
    const cols = ["payment_base_amount", "payment_discount_amount", "payment_gst_amount", "payment_final_amount"];
    for (const c of cols) {
      try {
        await db.execute(sql.raw(`ALTER TABLE "users" ADD COLUMN "${c}" numeric(12, 2)`));
        console.log(`Added ${c}`);
      } catch (e) {
        console.log(`${c} likely exists.`);
      }
    }
    console.log("Done.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
