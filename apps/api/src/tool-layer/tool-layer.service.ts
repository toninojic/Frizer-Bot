import { HttpException, Injectable } from '@nestjs/common';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  AppointmentStatus,
  BookingChannel,
  ConversationChannel,
  FeatureKey,
  Prisma,
} from '@prisma/client';
import { BookingEngineService } from '../booking-engine/booking-engine.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExecuteToolDto, ToolContextDto, ToolName } from './dto/execute-tool.dto';
import {
  BookAppointmentToolInputDto,
  CancelAppointmentToolInputDto,
  FindAvailableSlotsToolInputDto,
  FindCustomerToolInputDto,
  FindUpcomingAppointmentsForCustomerToolInputDto,
  GetSalonContextToolInputDto,
  LogConversationEventToolInputDto,
  RescheduleAppointmentToolInputDto,
  TransferCallToolInputDto,
} from './dto/tool-inputs.dto';

type ToolSuccessResponse = {
  ok: true;
  data: unknown;
};

type ToolErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ToolResponse = ToolSuccessResponse | ToolErrorResponse;

type AppointmentRecord = {
  id: string;
  salonId: string;
  workerId: string;
  customerId: string;
  serviceId: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  serviceNameSnapshot: string;
  workerNameSnapshot: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  channel: BookingChannel;
  notes: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  APPOINTMENT_NOT_FOUND: 'Appointment not found.',
  CUSTOMER_NOT_FOUND: 'Customer not found.',
  FEATURE_DISABLED: 'Feature is disabled for this salon.',
  INVALID_CONTEXT: 'Tool input does not match the execution context.',
  NEEDS_CLARIFICATION: 'More information is needed.',
  SALON_NOT_FOUND: 'Salon not found.',
  SERVICE_NOT_FOUND: 'Service not found.',
  SLOT_BLOCKED: 'Slot is blocked.',
  SLOT_CONFLICT: 'Slot is already booked.',
  SLOT_IN_PAST: 'You cannot book a slot in the past.',
  TOOL_NOT_FOUND: 'Tool does not exist.',
  VALIDATION_ERROR: 'Tool input validation failed.',
  WORKER_NOT_FOUND: 'Worker not found.',
};

@Injectable()
export class ToolLayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingEngineService: BookingEngineService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async execute(dto: ExecuteToolDto): Promise<ToolResponse> {
    let response: ToolResponse;

    try {
      const data = await this.executeTool(dto.toolName, dto.context, dto.input);
      response = {
        ok: true,
        data,
      };
    } catch (error) {
      response = this.toErrorResponse(error);
    }

    await this.logExecution(dto, response);

    return response;
  }

  private async executeTool(
    toolName: string,
    context: ToolContextDto,
    input: Record<string, unknown>,
  ) {
    switch (toolName) {
      case ToolName.GET_SALON_CONTEXT:
        return this.getSalonContext(
          context,
          this.validateInput(GetSalonContextToolInputDto, input),
        );
      case ToolName.FIND_AVAILABLE_SLOTS:
        return this.findAvailableSlots(
          context,
          this.validateInput(FindAvailableSlotsToolInputDto, input),
        );
      case ToolName.BOOK_APPOINTMENT:
        return this.bookAppointment(
          context,
          this.validateInput(BookAppointmentToolInputDto, input),
        );
      case ToolName.CANCEL_APPOINTMENT:
        return this.cancelAppointment(
          context,
          this.validateInput(CancelAppointmentToolInputDto, input),
        );
      case ToolName.RESCHEDULE_APPOINTMENT:
        return this.rescheduleAppointment(
          context,
          this.validateInput(RescheduleAppointmentToolInputDto, input),
        );
      case ToolName.FIND_CUSTOMER:
        return this.findCustomer(
          context,
          this.validateInput(FindCustomerToolInputDto, input),
        );
      case ToolName.FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER:
        return this.findUpcomingAppointmentsForCustomer(
          context,
          this.validateInput(
            FindUpcomingAppointmentsForCustomerToolInputDto,
            input,
          ),
        );
      case ToolName.TRANSFER_CALL:
        return this.transferCall(
          context,
          this.validateInput(TransferCallToolInputDto, input),
        );
      case ToolName.LOG_CONVERSATION_EVENT:
        return this.logConversationEvent(
          context,
          this.validateInput(LogConversationEventToolInputDto, input),
        );
      default:
        throw new ToolLayerError('TOOL_NOT_FOUND', ERROR_MESSAGES.TOOL_NOT_FOUND);
    }
  }

  private async getSalonContext(
    context: ToolContextDto,
    input: GetSalonContextToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.GET_SALON_CONTEXT);

    const salon = await this.prisma.salon.findUnique({
      where: { id: context.salonId },
      select: {
        id: true,
        name: true,
        timezone: true,
        receptionistName: true,
        welcomeMessage: true,
      },
    });

    if (!salon) {
      throw new ToolLayerError('SALON_NOT_FOUND', ERROR_MESSAGES.SALON_NOT_FOUND);
    }

    const [features, workers, services, workingHours] = await Promise.all([
      this.featureFlagsService.getSalonFeatures(context.salonId),
      this.prisma.worker.findMany({
        where: {
          salonId: context.salonId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      }),
      this.prisma.service.findMany({
        where: {
          salonId: context.salonId,
          isActive: true,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceAmount: true,
          isActive: true,
        },
      }),
      this.prisma.workingHour.findMany({
        where: { salonId: context.salonId },
        orderBy: { dayOfWeek: 'asc' },
        select: {
          dayOfWeek: true,
          opensAt: true,
          closesAt: true,
          isClosed: true,
        },
      }),
    ]);

    return {
      salon,
      features,
      workers,
      services: services.map((service) => ({
        ...service,
        priceAmount: service.priceAmount ? Number(service.priceAmount) : null,
      })),
      workingHours,
    };
  }

  private async findAvailableSlots(
    context: ToolContextDto,
    input: FindAvailableSlotsToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.FIND_AVAILABLE_SLOTS);

    return this.bookingEngineService.findAvailableSlots(context.salonId, {
      serviceId: input.serviceId,
      workerId: input.workerId,
      date: input.date,
      preferredTimeFrom: input.preferredTimeFrom,
      preferredTimeTo: input.preferredTimeTo,
      limit: input.limit,
    });
  }

  private async bookAppointment(
    context: ToolContextDto,
    input: BookAppointmentToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.BOOK_APPOINTMENT);

    return this.bookingEngineService.createBooking({
      salonId: context.salonId,
      workerId: input.workerId,
      serviceId: input.serviceId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      startAt: input.startAt,
      channel: this.toBookingChannel(context.channel),
    });
  }

  private async cancelAppointment(
    context: ToolContextDto,
    input: CancelAppointmentToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.CANCEL_APPOINTMENT);

    const appointmentId =
      input.appointmentId ??
      (await this.findClearUpcomingAppointmentId(
        context.salonId,
        input.customerPhone,
      ));

    return this.bookingEngineService.cancelBooking({
      salonId: context.salonId,
      appointmentId,
      reason: input.reason,
    });
  }

  private async rescheduleAppointment(
    context: ToolContextDto,
    input: RescheduleAppointmentToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.RESCHEDULE_APPOINTMENT);

    const appointmentId =
      input.appointmentId ??
      (await this.findClearUpcomingAppointmentId(
        context.salonId,
        input.customerPhone,
      ));

    return this.bookingEngineService.rescheduleBooking({
      salonId: context.salonId,
      appointmentId,
      newStartAt: input.newStartAt,
      workerId: input.workerId,
    });
  }

  private async findCustomer(
    context: ToolContextDto,
    input: FindCustomerToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.FIND_CUSTOMER);

    const customer = await this.prisma.customer.findUnique({
      where: {
        salonId_phone: {
          salonId: context.salonId,
          phone: input.phone,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        visitCount: true,
      },
    });

    return {
      found: Boolean(customer),
      customer,
    };
  }

  private async findUpcomingAppointmentsForCustomer(
    context: ToolContextDto,
    input: FindUpcomingAppointmentsForCustomerToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(
      context.salonId,
      context.channel,
      ToolName.FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER,
    );

    return {
      appointments: await this.findUpcomingAppointments(
        context.salonId,
        input.phone,
      ),
    };
  }

  private async transferCall(
    context: ToolContextDto,
    input: TransferCallToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(context.salonId, context.channel, ToolName.TRANSFER_CALL);

    const salon = await this.prisma.salon.findUnique({
      where: { id: context.salonId },
      select: {
        phone: true,
        transferPhone: true,
      },
    });

    if (!salon) {
      throw new ToolLayerError('SALON_NOT_FOUND', ERROR_MESSAGES.SALON_NOT_FOUND);
    }

    return {
      shouldTransfer: true,
      transferPhone: salon.transferPhone ?? salon.phone,
      reason: input.reason,
    };
  }

  private async logConversationEvent(
    context: ToolContextDto,
    input: LogConversationEventToolInputDto,
  ) {
    this.assertContextMatchesInput(context, input);
    await this.requireChannelFeatures(
      context.salonId,
      context.channel,
      ToolName.LOG_CONVERSATION_EVENT,
    );

    return {
      logged: true,
      conversationId: input.conversationId ?? context.conversationId ?? null,
      eventType: input.eventType,
    };
  }

  private async requireChannelFeatures(
    salonId: string,
    channel: ConversationChannel,
    toolName: ToolName,
  ) {
    if (this.isBookingTool(toolName)) {
      await this.featureFlagsService.requireFeature(
        salonId,
        channel === ConversationChannel.MANUAL
          ? FeatureKey.MANUAL_BOOKING
          : FeatureKey.AI_RECEPTIONIST,
      );
    }

    if (channel === ConversationChannel.PHONE) {
      await this.featureFlagsService.requireFeature(salonId, FeatureKey.VOICE);
    }

    if (channel === ConversationChannel.WHATSAPP) {
      await this.featureFlagsService.requireFeature(salonId, FeatureKey.WHATSAPP);
    }

    if (channel === ConversationChannel.INSTAGRAM) {
      await this.featureFlagsService.requireFeature(salonId, FeatureKey.INSTAGRAM);
    }

    // WEB_CHAT currently has no dedicated feature key; non-manual booking tools
    // are gated by AI_RECEPTIONIST until a separate web chat module exists.
    // Future SMS tools should require FeatureKey.SMS before provider calls.
  }

  private isBookingTool(toolName: ToolName) {
    return [
      ToolName.FIND_AVAILABLE_SLOTS,
      ToolName.BOOK_APPOINTMENT,
      ToolName.CANCEL_APPOINTMENT,
      ToolName.RESCHEDULE_APPOINTMENT,
    ].includes(toolName);
  }

  private async findClearUpcomingAppointmentId(
    salonId: string,
    customerPhone: string,
  ) {
    const appointments = await this.findUpcomingAppointments(salonId, customerPhone);

    if (appointments.length === 0) {
      throw new ToolLayerError(
        'APPOINTMENT_NOT_FOUND',
        ERROR_MESSAGES.APPOINTMENT_NOT_FOUND,
      );
    }

    if (appointments.length > 1) {
      throw new ToolLayerError(
        'NEEDS_CLARIFICATION',
        ERROR_MESSAGES.NEEDS_CLARIFICATION,
        {
          options: appointments,
        },
      );
    }

    return appointments[0].id;
  }

  private async findUpcomingAppointments(salonId: string, customerPhone: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        customerPhoneSnapshot: customerPhone,
        status: AppointmentStatus.BOOKED,
        startAt: {
          gte: new Date(),
        },
      },
      orderBy: { startAt: 'asc' },
      take: 5,
    });

    return appointments.map((appointment) =>
      this.toAppointmentResponse(appointment),
    );
  }

  private assertContextMatchesInput(
    context: ToolContextDto,
    input: { salonId?: string; channel?: ConversationChannel },
  ) {
    if (input.salonId && input.salonId !== context.salonId) {
      throw new ToolLayerError('INVALID_CONTEXT', ERROR_MESSAGES.INVALID_CONTEXT, {
        field: 'salonId',
      });
    }

    if (input.channel && input.channel !== context.channel) {
      throw new ToolLayerError('INVALID_CONTEXT', ERROR_MESSAGES.INVALID_CONTEXT, {
        field: 'channel',
      });
    }
  }

  private validateInput<T extends object>(
    dto: ClassConstructor<T>,
    input: Record<string, unknown>,
  ) {
    const instance = plainToInstance(dto, input ?? {});
    const errors = validateSync(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new ToolLayerError('VALIDATION_ERROR', ERROR_MESSAGES.VALIDATION_ERROR, {
        fields: errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        })),
      });
    }

    return instance;
  }

  private toBookingChannel(channel: ConversationChannel) {
    if (channel === ConversationChannel.PHONE) {
      return BookingChannel.PHONE;
    }

    if (channel === ConversationChannel.WHATSAPP) {
      return BookingChannel.WHATSAPP;
    }

    if (channel === ConversationChannel.INSTAGRAM) {
      return BookingChannel.INSTAGRAM;
    }

    // BookingChannel has no WEB_CHAT value yet; preserve existing DB enum until
    // web chat becomes a first-class booking source.
    return BookingChannel.MANUAL;
  }

  private toErrorResponse(error: unknown): ToolErrorResponse {
    const normalized = this.normalizeError(error);

    return {
      ok: false,
      error: normalized,
    };
  }

  private normalizeError(error: unknown): ToolErrorResponse['error'] {
    if (error instanceof ToolLayerError) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }

    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        const code = this.toErrorCode(body.code ?? body.message ?? error.name);
        const details = Object.fromEntries(
          Object.entries(body).filter(
            ([key]) => !['code', 'message', 'error', 'statusCode'].includes(key),
          ),
        );

        return {
          code,
          message: this.toErrorMessage(code, body.message),
          details: Object.keys(details).length > 0 ? details : undefined,
        };
      }

      const code = this.toErrorCode(response);
      return {
        code,
        message: this.toErrorMessage(code, response),
      };
    }

    if (error instanceof Error) {
      const code = this.toErrorCode(error.message);

      return {
        code,
        message: this.toErrorMessage(code, error.message),
      };
    }

    return {
      code: 'TOOL_EXECUTION_FAILED',
      message: 'Tool execution failed.',
    };
  }

  private toErrorCode(value: unknown): string {
    if (Array.isArray(value)) {
      return this.toErrorCode(value[0]);
    }

    if (typeof value !== 'string' || !value.trim()) {
      return 'TOOL_EXECUTION_FAILED';
    }

    return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  private toErrorMessage(code: string, fallback: unknown) {
    if (ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }

    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback;
    }

    if (Array.isArray(fallback) && typeof fallback[0] === 'string') {
      return fallback[0];
    }

    return 'Tool execution failed.';
  }

  private async logExecution(dto: ExecuteToolDto, response: ToolResponse) {
    try {
      await this.prisma.toolExecutionLog.create({
        data: {
          salonId: dto.context.salonId,
          channel: dto.context.channel,
          toolName: dto.toolName,
          inputJson: this.toJson({
            context: dto.context,
            input: dto.input,
          }),
          outputJson: response.ok ? this.toJson(response.data) : undefined,
          success: response.ok,
          errorCode: response.ok ? null : response.error.code,
          errorMessage: response.ok ? null : response.error.message,
        },
      });
    } catch {
      // Tool execution should not fail because logging failed.
    }
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toAppointmentResponse(appointment: AppointmentRecord) {
    return {
      id: appointment.id,
      salonId: appointment.salonId,
      workerId: appointment.workerId,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      customerName: appointment.customerNameSnapshot,
      customerPhone: appointment.customerPhoneSnapshot,
      serviceName: appointment.serviceNameSnapshot,
      workerName: appointment.workerNameSnapshot,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      channel: appointment.channel,
      notes: appointment.notes,
    };
  }
}

class ToolLayerError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
