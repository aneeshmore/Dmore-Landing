CREATE TYPE "public"."role" AS ENUM('admin', 'user');
CREATE TYPE "public"."plan_type" AS ENUM('basic', 'pro');
CREATE TYPE "public"."subscription_duration" AS ENUM('monthly', '6months', '1year');
CREATE TYPE "public"."account_status" AS ENUM('active', 'disabled');

--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"mobile" text,
	"company_name" text,
	"company_address" text,
	"domain" text,
	"number_of_users" integer DEFAULT 1,
	"plan_type" "plan_type" DEFAULT 'basic',
	"subscription_duration" "subscription_duration" DEFAULT 'monthly',
	"account_status" "account_status" DEFAULT 'active',
	"renewal_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
