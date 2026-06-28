import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConversationChannel,
  ConversationIntent,
  ConversationMessageRole,
  ConversationSessionStatus,
  ConversationState,
} from '@prisma/client';
import { ConversationEngineService } from '../src/conversation-engine/conversation-engine.service';
import { ConversationSessionView } from '../src/conversation-engine/conversation.types';
import { ConversationStateMachine } from '../src/conversation-engine/conversation-state-machine';
import { ToolName } from '../src/tool-layer/dto/execute-tool.dto';

class FakeConversationSessionService {
  sessions = new Map<string, ConversationSessionView>();
  messages: Array<{
    sessionId: string;
    role: ConversationMessageRole;
    content: string;
    metadata?: Record<string, unknown>;
  }> = [];

  async createSession(input: {
    salonId: string;
    channel: ConversationChannel;
    customerPhone?: string;
    currentState: ConversationState;
    collectedData: ConversationSessionView['collectedData'];
    assistantMessage?: string;
  }) {
    const now = new Date();
    const session: ConversationSessionView = {
      id: `session-${this.sessions.size + 1}`,
      salonId: input.salonId,
      channel: input.channel,
      customerPhone: input.customerPhone ?? null,
      status: ConversationSessionStatus.ACTIVE,
      currentState: input.currentState,
      collectedData: input.collectedData,
      lastUserMessage: null,
      lastAssistantMessage: input.assistantMessage ?? null,
      startedAt: now,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async findSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    assert(session, `Missing fake session ${sessionId}`);
    return session;
  }

  async updateSession(
    sessionId: string,
    data: Partial<
      Pick<
        ConversationSessionView,
        | 'currentState'
        | 'status'
        | 'collectedData'
        | 'lastUserMessage'
        | 'lastAssistantMessage'
        | 'endedAt'
      >
    >,
  ) {
    const session = await this.findSession(sessionId);
    const updated = {
      ...session,
      ...data,
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async endSession(
    sessionId: string,
    status = ConversationSessionStatus.COMPLETED,
  ) {
    return this.updateSession(sessionId, {
      currentState: ConversationState.END,
      status,
      endedAt: new Date(),
    });
  }

  async addMessage(
    sessionId: string,
    role: ConversationMessageRole,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    this.messages.push({ sessionId, role, content, metadata });
  }
}

class FakeToolLayer {
  upcomingAppointments = [
    {
      id: 'appointment-1',
      salonId: 'salon-1',
      workerId: 'worker-1',
      customerId: 'customer-1',
      serviceId: 'service-1',
      customerName: 'Marko',
      customerPhone: '+381641234567',
      serviceName: 'Sisanje',
      workerName: 'Ana',
      startAt: '2030-01-07T15:00:00.000Z',
      endAt: '2030-01-07T15:30:00.000Z',
      status: 'BOOKED',
      channel: 'PHONE',
      notes: null,
    },
  ];

  calls: Array<{ toolName: string; input: Record<string, unknown> }> = [];

  async execute(dto: { toolName: string; input: Record<string, unknown> }) {
    this.calls.push({ toolName: dto.toolName, input: dto.input });

    switch (dto.toolName) {
      case ToolName.GET_SALON_CONTEXT:
        return ok({
          salon: {
            id: 'salon-1',
            name: 'Salon Test',
            timezone: 'Europe/Belgrade',
            receptionistName: 'Mila',
            welcomeMessage: null,
          },
          features: [
            'MANUAL_BOOKING',
            'AI_RECEPTIONIST',
            'VOICE',
            'SMS',
            'WHATSAPP',
            'INSTAGRAM',
          ].map((featureKey) => ({ featureKey, enabled: true })),
          workers: [
            {
              id: 'worker-1',
              name: 'Ana',
              isActive: true,
            },
          ],
          services: [
            {
              id: 'service-1',
              name: 'Sisanje',
              durationMinutes: 30,
              priceAmount: 1200,
              isActive: true,
            },
          ],
          workingHours: [],
        });
      case ToolName.FIND_AVAILABLE_SLOTS:
        return ok({
          slots: [
            {
              workerId: 'worker-1',
              workerName: 'Ana',
              startAt: '2030-01-07T15:00:00.000Z',
              endAt: '2030-01-07T15:30:00.000Z',
            },
            {
              workerId: 'worker-1',
              workerName: 'Ana',
              startAt: '2030-01-07T16:00:00.000Z',
              endAt: '2030-01-07T16:30:00.000Z',
            },
          ],
        });
      case ToolName.BOOK_APPOINTMENT:
        return ok({ id: 'appointment-2' });
      case ToolName.CANCEL_APPOINTMENT:
        return ok({ id: dto.input.appointmentId });
      case ToolName.RESCHEDULE_APPOINTMENT:
        return ok({ id: dto.input.appointmentId });
      case ToolName.FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER:
        return ok({ appointments: this.upcomingAppointments });
      case ToolName.TRANSFER_CALL:
        return ok({
          shouldTransfer: true,
          transferPhone: '+381641112223',
        });
      case ToolName.LOG_CONVERSATION_EVENT:
        return ok({ logged: true });
      default:
        return {
          ok: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: 'Tool not found.',
          },
        };
    }
  }
}

test('starts a conversation', async () => {
  const { engine, sessions } = engineWith();
  const result = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
  });

  assert.equal(result.state, ConversationState.GREETING);
  assert.match(result.assistantMessage, /Salon Test/);
  assert.equal(sessions.messages[0].role, ConversationMessageRole.ASSISTANT);
});

test('detects booking intent', () => {
  const parsed = new ConversationStateMachine().parseUserMessage(
    'Hocu sisanje danas',
    salonContext(),
  );

  assert.equal(parsed.intent, ConversationIntent.BOOK_APPOINTMENT);
});

test('detects cancellation intent', () => {
  const parsed = new ConversationStateMachine().parseUserMessage(
    'Zelim da otkazem termin',
    salonContext(),
  );

  assert.equal(parsed.intent, ConversationIntent.CANCEL_APPOINTMENT);
});

test('detects reschedule intent', () => {
  const parsed = new ConversationStateMachine().parseUserMessage(
    'Mozemo li da pomerimo termin?',
    salonContext(),
  );

  assert.equal(parsed.intent, ConversationIntent.RESCHEDULE_APPOINTMENT);
});

test('detects talk-to-human intent', () => {
  const parsed = new ConversationStateMachine().parseUserMessage(
    'Hocu da pricam sa operaterom',
    salonContext(),
  );

  assert.equal(parsed.intent, ConversationIntent.TALK_TO_HUMAN);
});

test('booking flow with service already provided asks for worker preference', async () => {
  const { engine } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
  });

  const result = await engine.handleUserMessage(
    start.sessionId,
    'Hocu sisanje danas posle 4',
  );

  assert.equal(result.state, ConversationState.BOOKING_WORKER);
  assert.match(result.assistantMessage, /frizerke|prvi slobodan/);
});

test('booking flow with worker unspecified offers the first available slot', async () => {
  const { engine, sessions } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
  });

  await engine.handleUserMessage(start.sessionId, 'Hocu sisanje danas posle 4');
  const result = await engine.handleUserMessage(start.sessionId, 'Svejedno');
  const session = await sessions.findSession(start.sessionId);

  assert.equal(result.state, ConversationState.BOOKING_SLOT_CONFIRMATION);
  assert.equal(session.collectedData.workerId, null);
  assert.equal(session.collectedData.selectedSlot?.workerId, 'worker-1');
});

test('fallback after an unknown message increments fallback count', async () => {
  const { engine, sessions } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
  });

  const result = await engine.handleUserMessage(start.sessionId, 'Koliko je sati?');
  const session = await sessions.findSession(start.sessionId);

  assert.equal(result.state, ConversationState.FALLBACK);
  assert.equal(session.collectedData.fallbackCount, 1);
});

test('transfers to human after three fallback turns', async () => {
  const { engine } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
  });

  await engine.handleUserMessage(start.sessionId, 'Prva nejasna poruka');
  await engine.handleUserMessage(start.sessionId, 'Druga nejasna poruka');
  const result = await engine.handleUserMessage(
    start.sessionId,
    'Treca nejasna poruka',
  );

  assert.equal(result.state, ConversationState.TRANSFER_TO_HUMAN);
  assert.deepEqual(result.actions, [
    {
      type: 'TRANSFER_CALL',
      transferPhone: '+381641112223',
    },
  ]);
});

test('cancellation lookup asks for confirmation when one appointment exists', async () => {
  const { engine, toolLayer } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
  });

  const result = await engine.handleUserMessage(start.sessionId, 'Otkazi termin');

  assert.equal(result.state, ConversationState.CANCELLATION_CONFIRMATION);
  assert.ok(
    toolLayer.calls.some(
      (call) => call.toolName === ToolName.FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER,
    ),
  );
});

test('persists state and last user message after a turn', async () => {
  const { engine, sessions } = engineWith();
  const start = await engine.startConversation({
    salonId: 'salon-1',
    channel: ConversationChannel.PHONE,
    customerPhone: '+381641234567',
  });

  const result = await engine.handleUserMessage(
    start.sessionId,
    'Hocu sisanje danas posle 4',
  );
  const session = await sessions.findSession(start.sessionId);

  assert.equal(session.currentState, result.state);
  assert.equal(session.lastUserMessage, 'Hocu sisanje danas posle 4');
  assert.equal(session.lastAssistantMessage, result.assistantMessage);
});

function engineWith() {
  const sessions = new FakeConversationSessionService();
  const stateMachine = new ConversationStateMachine();
  const toolLayer = new FakeToolLayer();
  const engine = new ConversationEngineService(
    sessions as any,
    stateMachine,
    toolLayer as any,
  );

  return { engine, sessions, toolLayer };
}

function salonContext() {
  return {
    salon: {
      id: 'salon-1',
      name: 'Salon Test',
      timezone: 'Europe/Belgrade',
      receptionistName: 'Mila',
      welcomeMessage: null,
    },
    features: [],
    workers: [{ id: 'worker-1', name: 'Ana', isActive: true }],
    services: [{ id: 'service-1', name: 'Sisanje', isActive: true }],
    workingHours: [],
  };
}

function ok<T>(data: T) {
  return {
    ok: true as const,
    data,
  };
}
