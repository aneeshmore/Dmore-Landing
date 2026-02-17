ALTER TYPE "public"."subscription_duration" RENAME TO "subscription_duration_old";
CREATE TYPE "public"."subscription_duration" AS ENUM('monthly', '6months', '1year');

ALTER TABLE "users"
ALTER COLUMN "subscription_duration" TYPE "public"."subscription_duration"
USING (
  CASE
    WHEN "subscription_duration"::text = 'quarterly' THEN 'monthly'
    ELSE "subscription_duration"::text
  END
)::"public"."subscription_duration";

ALTER TABLE "users"
ALTER COLUMN "subscription_duration" SET DEFAULT 'monthly';

DROP TYPE "public"."subscription_duration_old";
