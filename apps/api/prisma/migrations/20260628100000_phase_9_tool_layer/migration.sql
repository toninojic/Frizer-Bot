-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('MANUAL', 'PHONE', 'WHATSAPP', 'INSTAGRAM', 'WEB_CHAT');

-- CreateTable
CREATE TABLE "tool_execution_logs" (
    "id" TEXT NOT NULL,
    "salon_id" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "success" BOOLEAN NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_execution_logs_salon_id_idx" ON "tool_execution_logs"("salon_id");

-- CreateIndex
CREATE INDEX "tool_execution_logs_channel_idx" ON "tool_execution_logs"("channel");

-- CreateIndex
CREATE INDEX "tool_execution_logs_tool_name_idx" ON "tool_execution_logs"("tool_name");

-- CreateIndex
CREATE INDEX "tool_execution_logs_created_at_idx" ON "tool_execution_logs"("created_at");

-- AddForeignKey
ALTER TABLE "tool_execution_logs" ADD CONSTRAINT "tool_execution_logs_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
