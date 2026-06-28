export type BookingChannel = 'phone' | 'whatsapp' | 'instagram' | 'manual';

export type UserRole = 'PLATFORM_ADMIN' | 'SALON_OWNER';

export type FeatureKey =
  | 'MANUAL_BOOKING'
  | 'AI_RECEPTIONIST'
  | 'VOICE'
  | 'SMS'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'REMINDERS'
  | 'CALL_RECORDING'
  | 'CALL_TRANSCRIPTS'
  | 'ANALYTICS';

export type ConversationChannel =
  | 'MANUAL'
  | 'PHONE'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'WEB_CHAT';

export type ToolName =
  | 'getSalonContext'
  | 'findAvailableSlots'
  | 'bookAppointment'
  | 'cancelAppointment'
  | 'rescheduleAppointment'
  | 'findCustomer'
  | 'findUpcomingAppointmentsForCustomer'
  | 'transferCall'
  | 'logConversationEvent';

export type ToolContext = {
  salonId: string;
  channel: ConversationChannel;
  conversationId?: string;
  customerPhone?: string;
};

export type ToolResponse<T = unknown> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

export type ConversationSessionStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'TRANSFERRED'
  | 'FAILED';

export type ConversationMessageRole =
  | 'USER'
  | 'ASSISTANT'
  | 'SYSTEM'
  | 'TOOL';

export type ConversationState =
  | 'START'
  | 'GREETING'
  | 'INTENT_DETECTION'
  | 'BOOKING_SERVICE'
  | 'BOOKING_WORKER'
  | 'BOOKING_DATE_TIME'
  | 'BOOKING_SLOT_CONFIRMATION'
  | 'BOOKING_CUSTOMER_NAME'
  | 'BOOKING_FINAL_CONFIRMATION'
  | 'BOOKING_COMPLETED'
  | 'CANCELLATION_LOOKUP'
  | 'CANCELLATION_CONFIRMATION'
  | 'CANCELLATION_COMPLETED'
  | 'RESCHEDULE_LOOKUP'
  | 'RESCHEDULE_DATE_TIME'
  | 'RESCHEDULE_SLOT_CONFIRMATION'
  | 'RESCHEDULE_COMPLETED'
  | 'TRANSFER_TO_HUMAN'
  | 'FALLBACK'
  | 'END';

export type ConversationIntent =
  | 'BOOK_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'RESCHEDULE_APPOINTMENT'
  | 'TALK_TO_HUMAN'
  | 'UNKNOWN';

export type ConversationAction =
  | {
      type: 'TRANSFER_CALL';
      transferPhone: string;
    }
  | {
      type: 'END_CALL' | 'SEND_SMS' | 'CREATE_REMINDER' | 'LOG_EVENT';
      payload?: Record<string, unknown>;
    };

export type ApiHealthResponse = {
  status: 'ok';
  service: 'ai-salon-receptionist-api';
};

export type DashboardWorker = {
  id: string;
  name: string;
  isActive: boolean;
};

export type DashboardService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number | null;
  isActive: boolean;
};

export type DashboardDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type DashboardWorkingHour = {
  id?: string;
  dayOfWeek: DashboardDayOfWeek;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export type DashboardTimeBlock = {
  id: string;
  title: string;
  workerId: string | null;
  workerName: string | null;
  startAt: string;
  endAt: string;
};

export type DashboardAppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export type DashboardAppointment = {
  id: string;
  salonId: string;
  workerId: string;
  customerId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  workerName: string;
  startAt: string;
  endAt: string;
  status: DashboardAppointmentStatus;
  channel: 'MANUAL' | 'PHONE' | 'WHATSAPP' | 'INSTAGRAM';
  notes: string | null;
};

export type BookingAvailableSlot = {
  workerId: string;
  workerName: string;
  startAt: string;
  endAt: string;
  label: string;
};
