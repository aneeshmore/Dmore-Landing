CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_type" text NOT NULL,
	"monthly_price" numeric(12, 2) NOT NULL,
	"six_month_price" numeric(12, 2) NOT NULL,
	"yearly_price" numeric(12, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "plans_plan_type_unique" UNIQUE("plan_type")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_base_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_discount_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_gst_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "payment_final_amount" numeric(12, 2);