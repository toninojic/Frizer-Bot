import { FeatureKey } from '@prisma/client';

export const FEATURE_KEYS: FeatureKey[] = [
  FeatureKey.MANUAL_BOOKING,
  FeatureKey.AI_RECEPTIONIST,
  FeatureKey.VOICE,
  FeatureKey.SMS,
  FeatureKey.WHATSAPP,
  FeatureKey.INSTAGRAM,
  FeatureKey.REMINDERS,
  FeatureKey.CALL_RECORDING,
  FeatureKey.CALL_TRANSCRIPTS,
  FeatureKey.ANALYTICS,
];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  [FeatureKey.MANUAL_BOOKING]: true,
  [FeatureKey.AI_RECEPTIONIST]: false,
  [FeatureKey.VOICE]: false,
  [FeatureKey.SMS]: false,
  [FeatureKey.WHATSAPP]: false,
  [FeatureKey.INSTAGRAM]: false,
  [FeatureKey.REMINDERS]: false,
  [FeatureKey.CALL_RECORDING]: false,
  [FeatureKey.CALL_TRANSCRIPTS]: false,
  [FeatureKey.ANALYTICS]: false,
};

// TODO: Gate future Twilio voice, SMS provider, WhatsApp, Instagram,
// reminders, recording, transcript, and analytics flows with these keys
// before running provider-specific logic.
