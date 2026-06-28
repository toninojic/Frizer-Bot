-- Add salon location metadata for platform administration.
ALTER TABLE "salons"
ADD COLUMN "city" TEXT;

-- Replace MVP role names with the two supported product roles.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'SALON_OWNER');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
ALTER COLUMN "role" TYPE "UserRole"
USING (
  CASE
    WHEN "role"::text = 'OWNER' THEN 'SALON_OWNER'
    WHEN "role"::text = 'ADMIN' THEN 'SALON_OWNER'
    ELSE "role"::text
  END
)::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'SALON_OWNER';
DROP TYPE "UserRole_old";

-- Platform admins are not tied to a salon. Salon owners must be tied to one.
ALTER TABLE "users"
ALTER COLUMN "salon_id" DROP NOT NULL;

DROP INDEX IF EXISTS "users_salon_id_email_key";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

ALTER TABLE "users"
ADD CONSTRAINT "users_role_salon_id_check"
CHECK (
  ("role" = 'PLATFORM_ADMIN' AND "salon_id" IS NULL)
  OR
  ("role" = 'SALON_OWNER' AND "salon_id" IS NOT NULL)
);
