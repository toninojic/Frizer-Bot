-- AlterTable
ALTER TABLE "salons"
ADD COLUMN "receptionist_name" TEXT,
ADD COLUMN "receptionist_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "welcome_message" TEXT,
ADD COLUMN "transfer_phone" TEXT,
ADD COLUMN "working_after_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sms_confirmations_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reminder_hours_before" INTEGER NOT NULL DEFAULT 2;
