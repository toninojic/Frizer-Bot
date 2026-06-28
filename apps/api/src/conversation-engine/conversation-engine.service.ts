import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationIntent,
  ConversationMessageRole,
  ConversationSessionStatus,
  ConversationState,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { ToolName } from '../tool-layer/dto/execute-tool.dto';
import { ToolLayerService, ToolResponse } from '../tool-layer/tool-layer.service';
import { ConversationSessionService } from './conversation-session.service';
import { ConversationStateMachine } from './conversation-state-machine';
import { StartConversationDto } from './dto/start-conversation.dto';
import {
  ConversationAction,
  ConversationAppointment,
  ConversationCollectedData,
  ConversationSessionView,
  ConversationSlot,
  ParsedUserMessage,
  SalonContextForConversation,
} from './conversation.types';

type ConversationResponse = {
  sessionId: string;
  state: ConversationState;
  assistantMessage: string;
  actions: ConversationAction[];
};

type StepResult = {
  state: ConversationState;
  data: ConversationCollectedData;
  assistantMessage: string;
  actions?: ConversationAction[];
  status?: ConversationSessionStatus;
};

@Injectable()
export class ConversationEngineService {
  constructor(
    private readonly sessions: ConversationSessionService,
    private readonly stateMachine: ConversationStateMachine,
    private readonly toolLayer: ToolLayerService,
  ) {}

  async startConversation(input: StartConversationDto): Promise<ConversationResponse> {
    const context = {
      salonId: input.salonId,
      channel: input.channel,
      customerPhone: input.customerPhone,
    };
    const salonContext = await this.getSalonContext(context);
    this.requireStartFeatures(input.channel, salonContext);

    const assistantMessage =
      salonContext.salon.welcomeMessage ||
      `Dobar dan, dobili ste ${salonContext.salon.name}. Ja sam ${
        salonContext.salon.receptionistName ?? 'virtualna recepcionarka'
      }. Kako mogu da vam pomognem?`;
    const session = await this.sessions.createSession({
      salonId: input.salonId,
      channel: input.channel,
      customerPhone: input.customerPhone,
      currentState: ConversationState.GREETING,
      collectedData: {
        customerPhone: input.customerPhone,
        fallbackCount: 0,
      },
      assistantMessage,
    });

    await this.sessions.addMessage(
      session.id,
      ConversationMessageRole.ASSISTANT,
      assistantMessage,
      { state: ConversationState.GREETING },
    );
    await this.logConversationEvent(session, 'CONVERSATION_STARTED', {
      state: ConversationState.GREETING,
    });

    return {
      sessionId: session.id,
      state: ConversationState.GREETING,
      assistantMessage,
      actions: [],
    };
  }

  async handleUserMessage(
    sessionId: string,
    message: string,
  ): Promise<ConversationResponse> {
    const session = await this.sessions.findSession(sessionId);

    if (session.status !== ConversationSessionStatus.ACTIVE) {
      throw new BadRequestException('CONVERSATION_SESSION_NOT_ACTIVE');
    }

    await this.sessions.addMessage(
      session.id,
      ConversationMessageRole.USER,
      message,
      { state: session.currentState },
    );

    const salonContext = await this.getSalonContext({
      salonId: session.salonId,
      channel: session.channel,
      conversationId: session.id,
      customerPhone: session.customerPhone ?? undefined,
    });
    this.requireStartFeatures(session.channel, salonContext);

    const parsed = this.stateMachine.parseUserMessage(
      message,
      salonContext,
      session,
    );
    const data = {
      ...this.stateMachine.updateCollectedData(session, parsed),
      customerPhone:
        parsed.customerPhoneCandidate ||
        session.collectedData.customerPhone ||
        session.customerPhone ||
        undefined,
    };
    const step = await this.route(session, parsed, data, salonContext);
    const status = step.status ?? ConversationSessionStatus.ACTIVE;
    const endedAt =
      status === ConversationSessionStatus.ACTIVE ? undefined : new Date();
    const updated = await this.sessions.updateSession(session.id, {
      currentState: step.state,
      status,
      collectedData: step.data,
      lastUserMessage: message,
      lastAssistantMessage: step.assistantMessage,
      endedAt,
    });

    await this.sessions.addMessage(
      session.id,
      ConversationMessageRole.ASSISTANT,
      step.assistantMessage,
      {
        previousState: session.currentState,
        nextState: step.state,
        actions: step.actions ?? [],
      },
    );
    await this.sessions.addMessage(
      session.id,
      ConversationMessageRole.SYSTEM,
      'STATE_TRANSITION',
      {
        from: session.currentState,
        to: step.state,
      },
    );
    await this.logConversationEvent(updated, 'STATE_TRANSITION', {
      from: session.currentState,
      to: step.state,
    });

    return {
      sessionId: session.id,
      state: step.state,
      assistantMessage: step.assistantMessage,
      actions: step.actions ?? [],
    };
  }

  async endConversation(sessionId: string, reason?: string) {
    await this.sessions.endSession(
      sessionId,
      ConversationSessionStatus.COMPLETED,
    );
    const assistantMessage = 'Razgovor je zavrsen. Hvala na pozivu.';
    const updated = await this.sessions.updateSession(sessionId, {
      lastAssistantMessage: assistantMessage,
    });

    await this.sessions.addMessage(
      sessionId,
      ConversationMessageRole.ASSISTANT,
      assistantMessage,
      { state: ConversationState.END, reason },
    );

    await this.sessions.addMessage(
      sessionId,
      ConversationMessageRole.SYSTEM,
      'CONVERSATION_ENDED',
      { reason },
    );
    await this.logConversationEvent(updated, 'CONVERSATION_ENDED', { reason });

    return {
      sessionId,
      state: ConversationState.END,
      assistantMessage,
      actions: [],
    };
  }

  private async route(
    session: ConversationSessionView,
    parsed: ParsedUserMessage,
    data: ConversationCollectedData,
    salonContext: SalonContextForConversation,
  ): Promise<StepResult> {
    if (parsed.intent === ConversationIntent.TALK_TO_HUMAN) {
      return this.transferToHuman(session, data);
    }

    const intent =
      data.intent && data.intent !== ConversationIntent.UNKNOWN
        ? data.intent
        : parsed.intent;

    if (!intent || intent === ConversationIntent.UNKNOWN) {
      return this.fallback(session, data);
    }

    data.intent = intent;

    if (intent === ConversationIntent.BOOK_APPOINTMENT) {
      return this.handleBooking(session, parsed, data, salonContext);
    }

    if (intent === ConversationIntent.CANCEL_APPOINTMENT) {
      return this.handleCancellation(session, parsed, data);
    }

    if (intent === ConversationIntent.RESCHEDULE_APPOINTMENT) {
      return this.handleReschedule(session, parsed, data, salonContext);
    }

    return this.fallback(session, data);
  }

  private async handleBooking(
    session: ConversationSessionView,
    parsed: ParsedUserMessage,
    data: ConversationCollectedData,
    salonContext: SalonContextForConversation,
  ): Promise<StepResult> {
    if (!data.serviceId) {
      return {
        state: ConversationState.BOOKING_SERVICE,
        data,
        assistantMessage: 'Koju uslugu zelite da zakazete?',
      };
    }

    if (!data.workerPreferenceSet) {
      return {
        state: ConversationState.BOOKING_WORKER,
        data,
        assistantMessage:
          'Da li zelite kod odredjene frizerke ili vam odgovara prvi slobodan termin?',
      };
    }

    if (session.currentState === ConversationState.BOOKING_SLOT_CONFIRMATION) {
      if (parsed.isConfirmation) {
        if (!data.customerName) {
          return {
            state: ConversationState.BOOKING_CUSTOMER_NAME,
            data,
            assistantMessage: data.customerPhone
              ? 'Na koje ime da zakazem termin?'
              : 'Na koje ime i broj telefona da zakazem termin?',
          };
        }

        return {
          state: ConversationState.BOOKING_FINAL_CONFIRMATION,
          data,
          assistantMessage: this.finalBookingQuestion(data),
        };
      }

      if (parsed.isRejection) {
        return this.offerNextSlotOrAskForNewTime(data);
      }

      return {
        state: ConversationState.BOOKING_SLOT_CONFIRMATION,
        data,
        assistantMessage: 'Da li vam ponudjeni termin odgovara?',
      };
    }

    if (session.currentState === ConversationState.BOOKING_CUSTOMER_NAME) {
      if (!data.customerName) {
        return {
          state: ConversationState.BOOKING_CUSTOMER_NAME,
          data,
          assistantMessage: 'Molim vas recite ime za termin.',
        };
      }

      if (!data.customerPhone) {
        return {
          state: ConversationState.BOOKING_CUSTOMER_NAME,
          data,
          assistantMessage: 'Koji je broj telefona za termin?',
        };
      }

      return {
        state: ConversationState.BOOKING_FINAL_CONFIRMATION,
        data,
        assistantMessage: this.finalBookingQuestion(data),
      };
    }

    if (session.currentState === ConversationState.BOOKING_FINAL_CONFIRMATION) {
      if (parsed.isConfirmation) {
        return this.confirmBooking(session, data);
      }

      if (parsed.isRejection) {
        return {
          state: ConversationState.END,
          data,
          assistantMessage: 'U redu, necu zakazati termin.',
          status: ConversationSessionStatus.COMPLETED,
        };
      }

      return {
        state: ConversationState.BOOKING_FINAL_CONFIRMATION,
        data,
        assistantMessage: this.finalBookingQuestion(data),
      };
    }

    if (!data.date || !data.preferredTimeFrom) {
      return {
        state: ConversationState.BOOKING_DATE_TIME,
        data,
        assistantMessage: 'Za koji dan i vreme zelite termin?',
      };
    }

    return this.findAndOfferSlot(session, data, salonContext);
  }

  private async handleCancellation(
    session: ConversationSessionView,
    parsed: ParsedUserMessage,
    data: ConversationCollectedData,
  ): Promise<StepResult> {
    if (!data.customerPhone) {
      return {
        state: ConversationState.CANCELLATION_LOOKUP,
        data,
        assistantMessage: 'Koji je broj telefona za termin koji otkazujete?',
      };
    }

    if (
      session.currentState === ConversationState.CANCELLATION_LOOKUP &&
      data.appointmentOptions?.length &&
      parsed.appointmentOptionIndex !== undefined
    ) {
      const selected = data.appointmentOptions[parsed.appointmentOptionIndex];

      if (selected) {
        data.appointmentId = selected.id;
        return {
          state: ConversationState.CANCELLATION_CONFIRMATION,
          data,
          assistantMessage: `Da li da otkazem termin ${formatAppointment(selected)}?`,
        };
      }
    }

    if (session.currentState === ConversationState.CANCELLATION_CONFIRMATION) {
      if (parsed.isConfirmation && data.appointmentId) {
        const response = await this.executeTool(session, ToolName.CANCEL_APPOINTMENT, {
          customerPhone: data.customerPhone,
          appointmentId: data.appointmentId,
        });
        const result = this.requireToolOk(response);
        data.appointmentId = (result as { id?: string }).id ?? data.appointmentId;

        return {
          state: ConversationState.CANCELLATION_COMPLETED,
          data,
          assistantMessage: 'Termin je otkazan.',
          status: ConversationSessionStatus.COMPLETED,
        };
      }

      if (parsed.isRejection) {
        return {
          state: ConversationState.END,
          data,
          assistantMessage: 'U redu, termin ostaje zakazan.',
          status: ConversationSessionStatus.COMPLETED,
        };
      }

      return {
        state: ConversationState.CANCELLATION_CONFIRMATION,
        data,
        assistantMessage: 'Da li zelite da otkazem ovaj termin?',
      };
    }

    const appointments = await this.lookupAppointments(session, data.customerPhone);

    if (appointments.length === 0) {
      return {
        state: ConversationState.CANCELLATION_COMPLETED,
        data,
        assistantMessage: 'Ne pronalazim buduce zakazane termine za taj broj.',
        status: ConversationSessionStatus.COMPLETED,
      };
    }

    if (appointments.length > 1) {
      data.appointmentOptions = appointments;
      return {
        state: ConversationState.CANCELLATION_LOOKUP,
        data,
        assistantMessage: `Pronasla sam vise termina. Koji zelite da otkazete? ${formatOptions(
          appointments,
        )}`,
      };
    }

    data.appointmentId = appointments[0].id;
    data.appointmentOptions = appointments;
    return {
      state: ConversationState.CANCELLATION_CONFIRMATION,
      data,
      assistantMessage: `Da li da otkazem termin ${formatAppointment(appointments[0])}?`,
    };
  }

  private async handleReschedule(
    session: ConversationSessionView,
    parsed: ParsedUserMessage,
    data: ConversationCollectedData,
    salonContext: SalonContextForConversation,
  ): Promise<StepResult> {
    if (!data.customerPhone) {
      return {
        state: ConversationState.RESCHEDULE_LOOKUP,
        data,
        assistantMessage: 'Koji je broj telefona za termin koji pomerate?',
      };
    }

    if (
      session.currentState === ConversationState.RESCHEDULE_LOOKUP &&
      data.appointmentOptions?.length &&
      parsed.appointmentOptionIndex !== undefined
    ) {
      const selected = data.appointmentOptions[parsed.appointmentOptionIndex];

      if (selected) {
        data.appointmentId = selected.id;
        data.serviceId = selected.serviceId;
        data.serviceName = selected.serviceName;
      }
    }

    if (!data.appointmentId) {
      const appointments = await this.lookupAppointments(session, data.customerPhone);

      if (appointments.length === 0) {
        return {
          state: ConversationState.RESCHEDULE_COMPLETED,
          data,
          assistantMessage: 'Ne pronalazim buduce zakazane termine za taj broj.',
          status: ConversationSessionStatus.COMPLETED,
        };
      }

      if (appointments.length > 1) {
        data.appointmentOptions = appointments;
        return {
          state: ConversationState.RESCHEDULE_LOOKUP,
          data,
          assistantMessage: `Pronasla sam vise termina. Koji zelite da pomerite? ${formatOptions(
            appointments,
          )}`,
        };
      }

      data.appointmentId = appointments[0].id;
      data.appointmentOptions = appointments;
      data.serviceId = appointments[0].serviceId;
      data.serviceName = appointments[0].serviceName;
    }

    if (session.currentState === ConversationState.RESCHEDULE_SLOT_CONFIRMATION) {
      if (parsed.isConfirmation && data.selectedSlot) {
        const response = await this.executeTool(
          session,
          ToolName.RESCHEDULE_APPOINTMENT,
          {
            customerPhone: data.customerPhone,
            appointmentId: data.appointmentId,
            newStartAt: data.selectedSlot.startAt,
            workerId: data.selectedSlot.workerId,
          },
        );
        this.requireToolOk(response);

        return {
          state: ConversationState.RESCHEDULE_COMPLETED,
          data,
          assistantMessage: `Termin je pomeren na ${formatSlot(data.selectedSlot)}.`,
          status: ConversationSessionStatus.COMPLETED,
        };
      }

      if (parsed.isRejection) {
        return this.offerNextSlotOrAskForNewTime(data, ConversationState.RESCHEDULE_DATE_TIME);
      }

      return {
        state: ConversationState.RESCHEDULE_SLOT_CONFIRMATION,
        data,
        assistantMessage: 'Da li vam novi termin odgovara?',
      };
    }

    if (!data.date || !data.preferredTimeFrom) {
      return {
        state: ConversationState.RESCHEDULE_DATE_TIME,
        data,
        assistantMessage: 'Za koji novi dan i vreme zelite termin?',
      };
    }

    const offer = await this.findAndOfferSlot(session, data, salonContext);
    return {
      ...offer,
      state: ConversationState.RESCHEDULE_SLOT_CONFIRMATION,
    };
  }

  private async findAndOfferSlot(
    session: ConversationSessionView,
    data: ConversationCollectedData,
    salonContext: SalonContextForConversation,
  ): Promise<StepResult> {
    if (!data.serviceId || !data.date) {
      return {
        state: ConversationState.BOOKING_DATE_TIME,
        data,
        assistantMessage: 'Za koji dan i vreme zelite termin?',
      };
    }

    let response = await this.executeTool(session, ToolName.FIND_AVAILABLE_SLOTS, {
      serviceId: data.serviceId,
      workerId: data.workerId ?? undefined,
      date: data.date,
      preferredTimeFrom: data.preferredTimeFrom ?? undefined,
      preferredTimeTo: data.preferredTimeTo ?? undefined,
      limit: 3,
    });
    let result = this.requireToolOk(response) as { slots: ConversationSlot[] };

    if (result.slots.length === 0 && isToday(data.date, salonContext.salon.timezone)) {
      data.date = DateTime.fromISO(data.date, {
        zone: salonContext.salon.timezone,
      })
        .plus({ days: 1 })
        .toISODate()!;
      response = await this.executeTool(session, ToolName.FIND_AVAILABLE_SLOTS, {
        serviceId: data.serviceId,
        workerId: data.workerId ?? undefined,
        date: data.date,
        preferredTimeFrom: data.preferredTimeFrom ?? undefined,
        preferredTimeTo: data.preferredTimeTo ?? undefined,
        limit: 3,
      });
      result = this.requireToolOk(response) as { slots: ConversationSlot[] };
    }

    if (result.slots.length === 0) {
      return {
        state:
          data.intent === ConversationIntent.RESCHEDULE_APPOINTMENT
            ? ConversationState.RESCHEDULE_DATE_TIME
            : ConversationState.BOOKING_DATE_TIME,
        data,
        assistantMessage:
          'Nemam slobodan termin za taj izbor. Da li zelite drugi dan ili vreme?',
      };
    }

    data.offeredSlots = result.slots;
    data.offeredSlotIndex = 0;
    data.selectedSlot = result.slots[0];

    return {
      state:
        data.intent === ConversationIntent.RESCHEDULE_APPOINTMENT
          ? ConversationState.RESCHEDULE_SLOT_CONFIRMATION
          : ConversationState.BOOKING_SLOT_CONFIRMATION,
      data,
      assistantMessage: `Imam slobodan termin ${formatSlot(result.slots[0])}. Da li vam odgovara?`,
    };
  }

  private offerNextSlotOrAskForNewTime(
    data: ConversationCollectedData,
    fallbackState: ConversationState = ConversationState.BOOKING_DATE_TIME,
  ): StepResult {
    const slots = data.offeredSlots ?? [];
    const nextIndex = (data.offeredSlotIndex ?? 0) + 1;
    const nextSlot = slots[nextIndex];

    if (!nextSlot) {
      return {
        state: fallbackState,
        data,
        assistantMessage:
          'Nemam jos ponudjenih termina. Koji drugi dan ili vreme vam odgovara?',
      };
    }

    data.offeredSlotIndex = nextIndex;
    data.selectedSlot = nextSlot;

    return {
      state:
        data.intent === ConversationIntent.RESCHEDULE_APPOINTMENT
          ? ConversationState.RESCHEDULE_SLOT_CONFIRMATION
          : ConversationState.BOOKING_SLOT_CONFIRMATION,
      data,
      assistantMessage: `Mogu da ponudim ${formatSlot(nextSlot)}. Da li vam odgovara?`,
    };
  }

  private async confirmBooking(
    session: ConversationSessionView,
    data: ConversationCollectedData,
  ): Promise<StepResult> {
    if (!data.selectedSlot || !data.customerName || !data.customerPhone || !data.serviceId) {
      return {
        state: ConversationState.BOOKING_CUSTOMER_NAME,
        data,
        assistantMessage:
          'Nedostaje mi ime ili broj telefona za zakazivanje termina.',
      };
    }

    const response = await this.executeTool(session, ToolName.BOOK_APPOINTMENT, {
      workerId: data.selectedSlot.workerId,
      serviceId: data.serviceId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      startAt: data.selectedSlot.startAt,
    });
    const appointment = this.requireToolOk(response) as { id?: string };
    data.appointmentId = appointment.id ?? null;

    return {
      state: ConversationState.BOOKING_COMPLETED,
      data,
      assistantMessage: `Termin je zakazan za ${formatSlot(data.selectedSlot)}. Hvala!`,
      status: ConversationSessionStatus.COMPLETED,
    };
  }

  private finalBookingQuestion(data: ConversationCollectedData) {
    return `Da potvrdim: ${data.serviceName ?? 'usluga'} za ${
      data.customerName ?? 'klijenta'
    }, ${data.selectedSlot ? formatSlot(data.selectedSlot) : 'izabrani termin'}. Da li zakazujem?`;
  }

  private async lookupAppointments(
    session: ConversationSessionView,
    customerPhone: string,
  ) {
    const response = await this.executeTool(
      session,
      ToolName.FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER,
      { phone: customerPhone },
    );
    const result = this.requireToolOk(response) as {
      appointments: ConversationAppointment[];
    };

    return result.appointments;
  }

  private async fallback(
    session: ConversationSessionView,
    data: ConversationCollectedData,
  ): Promise<StepResult> {
    data.fallbackCount = (data.fallbackCount ?? 0) + 1;

    if (data.fallbackCount >= 3) {
      return this.transferToHuman(session, data);
    }

    return {
      state: ConversationState.FALLBACK,
      data,
      assistantMessage:
        'Izvinite, nisam sigurna da sam razumela. Da li zelite da zakazete, otkazete ili pomerite termin?',
    };
  }

  private async transferToHuman(
    session: ConversationSessionView,
    data: ConversationCollectedData,
  ): Promise<StepResult> {
    const response = await this.executeTool(session, ToolName.TRANSFER_CALL, {
      reason: 'CUSTOMER_REQUESTED_HUMAN',
    });
    const result = this.requireToolOk(response) as {
      transferPhone?: string;
    };

    return {
      state: ConversationState.TRANSFER_TO_HUMAN,
      data,
      assistantMessage: 'U redu, prebacicu vas frizerki.',
      actions: result.transferPhone
        ? [
            {
              type: 'TRANSFER_CALL',
              transferPhone: result.transferPhone,
            },
          ]
        : [],
      status: ConversationSessionStatus.TRANSFERRED,
    };
  }

  private async getSalonContext(context: {
    salonId: string;
    channel: ConversationChannel;
    conversationId?: string;
    customerPhone?: string;
  }) {
    const response = await this.toolLayer.execute({
      toolName: ToolName.GET_SALON_CONTEXT,
      context,
      input: {
        salonId: context.salonId,
      },
    });

    return this.requireToolOk(response) as SalonContextForConversation;
  }

  private async executeTool(
    session: ConversationSessionView,
    toolName: ToolName,
    input: Record<string, unknown>,
  ) {
    return this.toolLayer.execute({
      toolName,
      context: {
        salonId: session.salonId,
        channel: session.channel,
        conversationId: session.id,
        customerPhone: session.customerPhone ?? undefined,
      },
      input,
    });
  }

  private async logConversationEvent(
    session: ConversationSessionView,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await this.toolLayer.execute({
      toolName: ToolName.LOG_CONVERSATION_EVENT,
      context: {
        salonId: session.salonId,
        channel: session.channel,
        conversationId: session.id,
        customerPhone: session.customerPhone ?? undefined,
      },
      input: {
        eventType,
        conversationId: session.id,
        payload,
      },
    });
  }

  private requireStartFeatures(
    channel: ConversationChannel,
    salonContext: SalonContextForConversation,
  ) {
    const requiredFeatures = this.requiredStartFeatures(channel);
    const missingFeature = requiredFeatures.find(
      (featureKey) => !this.featureEnabled(salonContext, featureKey),
    );

    if (missingFeature) {
      throw new ForbiddenException({
        code: 'FEATURE_DISABLED',
        message: `${missingFeature} is not enabled for this salon.`,
      });
    }
  }

  private requiredStartFeatures(channel: ConversationChannel) {
    switch (channel) {
      case ConversationChannel.PHONE:
        return ['VOICE', 'AI_RECEPTIONIST'];
      case ConversationChannel.WHATSAPP:
        return ['WHATSAPP', 'AI_RECEPTIONIST'];
      case ConversationChannel.INSTAGRAM:
        return ['INSTAGRAM', 'AI_RECEPTIONIST'];
      case ConversationChannel.WEB_CHAT:
        return ['AI_RECEPTIONIST'];
      case ConversationChannel.MANUAL:
      default:
        return ['MANUAL_BOOKING'];
    }
  }

  private featureEnabled(
    salonContext: SalonContextForConversation,
    featureKey: string,
  ) {
    return salonContext.features.some(
      (feature) => feature.featureKey === featureKey && feature.enabled,
    );
  }

  private requireToolOk(response: ToolResponse) {
    if (response.ok) {
      return response.data;
    }

    if (response.error.code === 'FEATURE_DISABLED') {
      throw new ForbiddenException(response.error);
    }

    throw new BadRequestException(response.error);
  }
}

function formatSlot(slot: ConversationSlot) {
  const dateTime = DateTime.fromISO(slot.startAt, { zone: 'utc' }).setZone(
    'Europe/Belgrade',
  );
  return `${dateTime.toFormat('dd.LL.yyyy.')} u ${dateTime.toFormat('HH:mm')} kod ${
    slot.workerName
  }`;
}

function formatAppointment(appointment: ConversationAppointment) {
  const slot = {
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    workerId: appointment.workerId,
    workerName: appointment.workerName,
  };
  return `${appointment.serviceName}, ${formatSlot(slot)}`;
}

function formatOptions(appointments: ConversationAppointment[]) {
  return appointments
    .map((appointment, index) => `${index + 1}. ${formatAppointment(appointment)}`)
    .join(' ');
}

function isToday(date: string, timezone: string) {
  return (
    DateTime.fromISO(date, { zone: timezone }).toISODate() ===
    DateTime.now().setZone(timezone).toISODate()
  );
}
