import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationMessageRole,
  ConversationSessionStatus,
  ConversationState,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConversationCollectedData,
  ConversationSessionView,
} from './conversation.types';

@Injectable()
export class ConversationSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(input: {
    salonId: string;
    channel: ConversationChannel;
    customerPhone?: string;
    currentState: ConversationState;
    collectedData: ConversationCollectedData;
    assistantMessage?: string;
  }) {
    const session = await this.prisma.conversationSession.create({
      data: {
        salonId: input.salonId,
        channel: input.channel,
        customerPhone: input.customerPhone,
        currentState: input.currentState,
        collectedData: this.toJson(input.collectedData),
        lastAssistantMessage: input.assistantMessage,
      },
    });

    return this.toView(session);
  }

  async findSession(sessionId: string) {
    const session = await this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('CONVERSATION_SESSION_NOT_FOUND');
    }

    return this.toView(session);
  }

  async updateSession(
    sessionId: string,
    data: {
      currentState?: ConversationState;
      status?: ConversationSessionStatus;
      collectedData?: ConversationCollectedData;
      lastUserMessage?: string;
      lastAssistantMessage?: string;
      endedAt?: Date | null;
    },
  ) {
    const session = await this.prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        currentState: data.currentState,
        status: data.status,
        collectedData: data.collectedData
          ? this.toJson(data.collectedData)
          : undefined,
        lastUserMessage: data.lastUserMessage,
        lastAssistantMessage: data.lastAssistantMessage,
        endedAt: data.endedAt,
      },
    });

    return this.toView(session);
  }

  async endSession(
    sessionId: string,
    status: ConversationSessionStatus = ConversationSessionStatus.COMPLETED,
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
    return this.prisma.conversationMessage.create({
      data: {
        sessionId,
        role,
        content,
        metadata: metadata ? this.toJson(metadata) : undefined,
      },
    });
  }

  private toView(session: {
    id: string;
    salonId: string;
    channel: ConversationChannel;
    customerPhone: string | null;
    status: ConversationSessionStatus;
    currentState: ConversationState;
    collectedData: Prisma.JsonValue;
    lastUserMessage: string | null;
    lastAssistantMessage: string | null;
    startedAt: Date;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationSessionView {
    return {
      ...session,
      collectedData: this.fromJson(session.collectedData),
    };
  }

  private fromJson(value: Prisma.JsonValue): ConversationCollectedData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as ConversationCollectedData;
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }
}
