import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, BookingChannel, CallOutcome } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDashboardSalonDto } from './dto/update-dashboard-salon.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';

const salonSettingsSelect = {
  id: true,
  name: true,
  phone: true,
  timezone: true,
  receptionistName: true,
  receptionistEnabled: true,
  welcomeMessage: true,
  transferPhone: true,
  workingAfterHoursEnabled: true,
  smsConfirmationsEnabled: true,
  reminderHoursBefore: true,
} as const;

const DEFAULT_TIMEZONE = 'Europe/Belgrade';

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

type CallLogRecord = {
  id: string;
  customerPhone: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  outcome: CallOutcome;
};

@Injectable()
export class DashboardSalonService {
  constructor(private readonly prisma: PrismaService) {}

  async findSalon(salonId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return salon;
  }

  async updateSalon(salonId: string, dto: UpdateDashboardSalonDto) {
    const result = await this.prisma.salon.updateMany({
      where: { id: salonId },
      data: {
        name: dto.name,
        phone: dto.phone,
        timezone: dto.timezone,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Salon not found');
    }

    return this.findSalon(salonId);
  }

  async findSettings(salonId: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: salonSettingsSelect,
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return salon;
  }

  async findToday(salonId: string) {
    const salon = await this.findSettings(salonId);
    const timezone = salon.timezone || DEFAULT_TIMEZONE;
    const today = DateTime.now().setZone(timezone);
    const from = today.startOf('day').toJSDate();
    const to = today.endOf('day').toJSDate();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });
    const now = new Date();
    const mappedAppointments = appointments.map((appointment) =>
      this.toAppointmentResponse(appointment),
    );

    return {
      date: today.toISODate(),
      nextAppointment:
        mappedAppointments.find(
          (appointment) =>
            appointment.status === AppointmentStatus.BOOKED &&
            new Date(appointment.startAt) >= now,
        ) ?? null,
      stats: {
        booked: appointments.filter(
          (appointment) => appointment.status === AppointmentStatus.BOOKED,
        ).length,
        completed: appointments.filter(
          (appointment) => appointment.status === AppointmentStatus.COMPLETED,
        ).length,
        cancelled: appointments.filter(
          (appointment) => appointment.status === AppointmentStatus.CANCELLED,
        ).length,
      },
      appointments: mappedAppointments,
    };
  }

  async findRecentCalls(salonId: string) {
    const callLogs = await this.prisma.callLog.findMany({
      where: {
        salonId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 3,
    });

    return callLogs.map((callLog) => this.toCallLogResponse(callLog));
  }

  async updateSettings(salonId: string, dto: UpdateSalonSettingsDto) {
    const result = await this.prisma.salon.updateMany({
      where: { id: salonId },
      data: {
        receptionistName: dto.receptionistName,
        receptionistEnabled: dto.receptionistEnabled,
        welcomeMessage: dto.welcomeMessage,
        transferPhone: dto.transferPhone,
        workingAfterHoursEnabled: dto.workingAfterHoursEnabled,
        smsConfirmationsEnabled: dto.smsConfirmationsEnabled,
        reminderHoursBefore: dto.reminderHoursBefore,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Salon not found');
    }

    return this.findSettings(salonId);
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

  private toCallLogResponse(callLog: CallLogRecord) {
    return {
      id: callLog.id,
      customerPhone: callLog.customerPhone,
      startedAt: callLog.startedAt.toISOString(),
      endedAt: callLog.endedAt?.toISOString() ?? null,
      durationSeconds: callLog.durationSeconds,
      outcome: callLog.outcome,
    };
  }
}
