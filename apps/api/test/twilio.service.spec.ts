import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CallOutcome,
  ConversationChannel,
  ConversationState,
  DayOfWeek,
  FeatureKey,
} from '@prisma/client';
import { TwilioService } from '../src/twilio/twilio.service';

class FakeConfig {
  get<T = unknown>(key: string): T {
    const values: Record<string, unknown> = {
      'app.publicWebhookBaseUrl': 'https://example.ngrok-free.app',
      'twilio.authToken': 'auth-token',
      'twilio.validateSignature': false,
    };

    return values[key] as T;
  }
}

class FakeConversationEngine {
  startedWith: unknown;

  async startConversation(input: unknown) {
    this.startedWith = input;

    return {
      sessionId: 'session-1',
      state: ConversationState.GREETING,
      assistantMessage: 'Dobar dan, Salon Ana. Kako mogu da vam pomognem?',
      actions: [],
    };
  }
}

class FakeFeatureFlags {
  async isEnabled(_salonId: string, featureKey: FeatureKey) {
    const enabledFeatures: FeatureKey[] = [
      FeatureKey.VOICE,
      FeatureKey.AI_RECEPTIONIST,
    ];

    return enabledFeatures.includes(featureKey);
  }
}

class FakePrisma {
  salonRecord = {
    id: 'salon-1',
    name: 'Salon Ana',
    phone: '+381641112223',
    twilioPhoneNumber: '+14155550123',
    timezone: 'Europe/Belgrade',
    isActive: true,
    receptionistEnabled: true,
    transferPhone: '+381641112223',
    workingAfterHoursEnabled: false,
  };
  callLogRecord = {
    transcript: null as string | null,
  };
  createdCallLogs: unknown[] = [];

  salon = {
    findUnique: async ({ where }: any) =>
      where.twilioPhoneNumber === this.salonRecord.twilioPhoneNumber
        ? this.salonRecord
        : null,
    findMany: async () => [],
  };

  workingHour = {
    findUnique: async () => ({
      opensAt: '00:00',
      closesAt: '23:59',
      isClosed: false,
      dayOfWeek: DayOfWeek.TUESDAY,
    }),
  };

  callLog = {
    upsert: async ({ create }: any) => {
      this.createdCallLogs.push(create);
      return create;
    },
    findUnique: async () => this.callLogRecord,
    update: async ({ data }: any) => {
      Object.assign(this.callLogRecord, data);
      return this.callLogRecord;
    },
    updateMany: async () => ({ count: 1 }),
  };

  conversationSession = {
    updateMany: async () => ({ count: 0 }),
    findFirst: async () => null,
  };
}

test('voice webhook starts a phone conversation and returns TwiML Gather', async () => {
  const prisma = new FakePrisma();
  const conversationEngine = new FakeConversationEngine();
  const service = new TwilioService(
    new FakeConfig() as any,
    conversationEngine as any,
    new FakeFeatureFlags() as any,
    prisma as any,
  );

  const twiml = await service.handleVoiceWebhook({
    To: '+14155550123',
    From: '+381641234567',
    CallSid: 'CA123',
  });

  assert.match(twiml, /<Gather/);
  assert.match(twiml, /\/webhooks\/twilio\/gather/);
  assert.deepEqual(conversationEngine.startedWith, {
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
    twilioCallSid: 'CA123',
  });
  assert.deepEqual(prisma.createdCallLogs[0], {
    salonId: 'salon-1',
    customerPhone: '+381641234567',
    twilioCallSid: 'CA123',
    startedAt: (prisma.createdCallLogs[0] as any).startedAt,
    outcome: CallOutcome.INFO_ONLY,
  });
});

test('voice webhook hangs up when no salon matches the called number', async () => {
  const service = new TwilioService(
    new FakeConfig() as any,
    new FakeConversationEngine() as any,
    new FakeFeatureFlags() as any,
    new FakePrisma() as any,
  );

  const twiml = await service.handleVoiceWebhook({
    To: '+14155550000',
    From: '+381641234567',
    CallSid: 'CA404',
  });

  assert.match(twiml, /ne mozemo da pronadjemo salon/);
  assert.match(twiml, /<Hangup\/>/);
});
