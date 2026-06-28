-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('MANUAL_BOOKING', 'AI_RECEPTIONIST', 'VOICE', 'SMS', 'WHATSAPP', 'INSTAGRAM', 'REMINDERS', 'CALL_RECORDING', 'CALL_TRANSCRIPTS', 'ANALYTICS');

-- CreateTable
CREATE TABLE "salon_features" (
    "id" TEXT NOT NULL,
    "salon_id" TEXT NOT NULL,
    "feature_key" "FeatureKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salon_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "salon_features_salon_id_idx" ON "salon_features"("salon_id");

-- CreateIndex
CREATE UNIQUE INDEX "salon_features_salon_id_feature_key_key" ON "salon_features"("salon_id", "feature_key");

-- AddForeignKey
ALTER TABLE "salon_features" ADD CONSTRAINT "salon_features_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
