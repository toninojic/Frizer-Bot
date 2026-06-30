import {
  ConversationChannel,
  ConversationIntent,
  ConversationSessionStatus,
  ConversationState,
} from '@prisma/client';

export type ConversationAction =
  | {
      type: 'TRANSFER_CALL';
      transferPhone: string;
    }
  | {
      type: 'END_CALL' | 'SEND_SMS' | 'CREATE_REMINDER' | 'LOG_EVENT';
      payload?: Record<string, unknown>;
    };

export type ConversationCollectedData = {
  intent?: ConversationIntent;
  serviceId?: string;
  serviceName?: string;
  workerId?: string | null;
  workerName?: string | null;
  workerPreferenceSet?: boolean;
  date?: string;
  preferredTimeFrom?: string | null;
  preferredTimeTo?: string | null;
  selectedSlot?: ConversationSlot | null;
  offeredSlots?: ConversationSlot[];
  offeredSlotIndex?: number;
  customerName?: string;
  customerPhone?: string;
  appointmentId?: string | null;
  appointmentOptions?: ConversationAppointment[];
  fallbackCount?: number;
};

export type ConversationSlot = {
  workerId: string;
  workerName: string;
  startAt: string;
  endAt: string;
  label?: string;
};

export type ConversationAppointment = {
  id: string;
  salonId: string;
  workerId: string;
  customerId?: string;
  serviceId: string;
  customerName?: string;
  customerPhone?: string;
  serviceName: string;
  workerName: string;
  startAt: string;
  endAt: string;
  status?: string;
  channel?: string;
  notes?: string | null;
};

export type ConversationSessionView = {
  id: string;
  salonId: string;
  channel: ConversationChannel;
  customerPhone: string | null;
  twilioCallSid: string | null;
  status: ConversationSessionStatus;
  currentState: ConversationState;
  collectedData: ConversationCollectedData;
  lastUserMessage: string | null;
  lastAssistantMessage: string | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ParsedUserMessage = {
  rawText: string;
  normalizedText: string;
  intent?: ConversationIntent;
  serviceId?: string;
  serviceName?: string;
  workerId?: string;
  workerName?: string;
  wantsAnyWorker?: boolean;
  date?: string;
  preferredTimeFrom?: string | null;
  preferredTimeTo?: string | null;
  isConfirmation?: boolean;
  isRejection?: boolean;
  appointmentOptionIndex?: number;
  customerNameCandidate?: string;
  customerPhoneCandidate?: string;
};

export type SalonContextForConversation = {
  salon: {
    id: string;
    name: string;
    timezone: string;
    receptionistName: string | null;
    welcomeMessage: string | null;
  };
  features: Array<{
    featureKey: string;
    enabled: boolean;
  }>;
  workers: Array<{
    id: string;
    name: string;
    isActive?: boolean;
  }>;
  services: Array<{
    id: string;
    name: string;
    durationMinutes?: number;
    priceAmount?: number | null;
    isActive?: boolean;
  }>;
  workingHours: Array<{
    dayOfWeek: string;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
  }>;
};
