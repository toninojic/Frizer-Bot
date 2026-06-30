-- Add Twilio mapping fields for inbound voice calls.
ALTER TABLE "salons"
ADD COLUMN "twilio_phone_number" TEXT;

ALTER TABLE "salons"
ALTER COLUMN "receptionist_enabled" SET DEFAULT true;

ALTER TABLE "call_logs"
ADD COLUMN "twilio_call_sid" TEXT;

ALTER TABLE "conversation_sessions"
ADD COLUMN "twilio_call_sid" TEXT;

-- Twilio numbers and call SIDs are unique when present. PostgreSQL allows
-- multiple NULL values in unique indexes, which is what we want for non-Twilio
-- salons or manually-created calls.
CREATE UNIQUE INDEX "salons_twilio_phone_number_key" ON "salons"("twilio_phone_number");
CREATE UNIQUE INDEX "call_logs_twilio_call_sid_key" ON "call_logs"("twilio_call_sid");
CREATE INDEX "call_logs_started_at_idx" ON "call_logs"("started_at");
CREATE UNIQUE INDEX "conversation_sessions_twilio_call_sid_key" ON "conversation_sessions"("twilio_call_sid");
