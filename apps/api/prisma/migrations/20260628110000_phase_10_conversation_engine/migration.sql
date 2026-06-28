-- CreateEnum
CREATE TYPE "ConversationSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConversationMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('START', 'GREETING', 'INTENT_DETECTION', 'BOOKING_SERVICE', 'BOOKING_WORKER', 'BOOKING_DATE_TIME', 'BOOKING_SLOT_CONFIRMATION', 'BOOKING_CUSTOMER_NAME', 'BOOKING_FINAL_CONFIRMATION', 'BOOKING_COMPLETED', 'CANCELLATION_LOOKUP', 'CANCELLATION_CONFIRMATION', 'CANCELLATION_COMPLETED', 'RESCHEDULE_LOOKUP', 'RESCHEDULE_DATE_TIME', 'RESCHEDULE_SLOT_CONFIRMATION', 'RESCHEDULE_COMPLETED', 'TRANSFER_TO_HUMAN', 'FALLBACK', 'END');

-- CreateEnum
CREATE TYPE "ConversationIntent" AS ENUM ('BOOK_APPOINTMENT', 'CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT', 'TALK_TO_HUMAN', 'UNKNOWN');

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" TEXT NOT NULL,
    "salon_id" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "customer_phone" TEXT,
    "status" "ConversationSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_state" "ConversationState" NOT NULL DEFAULT 'START',
    "collected_data" JSONB NOT NULL DEFAULT '{}',
    "last_user_message" TEXT,
    "last_assistant_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "ConversationMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_sessions_salon_id_idx" ON "conversation_sessions"("salon_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_channel_idx" ON "conversation_sessions"("channel");

-- CreateIndex
CREATE INDEX "conversation_sessions_status_idx" ON "conversation_sessions"("status");

-- CreateIndex
CREATE INDEX "conversation_sessions_current_state_idx" ON "conversation_sessions"("current_state");

-- CreateIndex
CREATE INDEX "conversation_sessions_created_at_idx" ON "conversation_sessions"("created_at");

-- CreateIndex
CREATE INDEX "conversation_messages_session_id_idx" ON "conversation_messages"("session_id");

-- CreateIndex
CREATE INDEX "conversation_messages_role_idx" ON "conversation_messages"("role");

-- CreateIndex
CREATE INDEX "conversation_messages_created_at_idx" ON "conversation_messages"("created_at");

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
