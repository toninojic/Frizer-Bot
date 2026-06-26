import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, BookingChannel } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TIMEZONE = 'Europe/Belgrade';

type AppointmentFilters = {
  date?: string;
  from?: string;
  to?: string;
};

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

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForSalon(salonId: string, filters: AppointmentFilters = {}) {
    const dateRange = await this.toDateRange(salonId, filters);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        salonId,
        startAt: dateRange
          ? {
              gte: dateRange.from,
              lte: dateRange.to,
            }
          : undefined,
      },
      orderBy: { startAt: 'asc' },
    });

    return appointments.map((appointment) =>
      this.toAppointmentResponse(appointment),
    );
  }

  async findOneForSalon(salonId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        salonId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('APPOINTMENT_NOT_FOUND');
    }

    return this.toAppointmentResponse(appointment);
  }

  private async toDateRange(salonId: string, filters: AppointmentFilters) {
    if (!filters.date && !filters.from && !filters.to) {
      return null;
    }

    const salon = await this.prisma.salon.findFirst({
      where: {
        id: salonId,
      },
      select: {
        timezone: true,
      },
    });

    const timezone = salon?.timezone || DEFAULT_TIMEZONE;

    if (filters.date) {
      const date = DateTime.fromISO(filters.date, { zone: timezone });

      if (!date.isValid) {
        throw new BadRequestException('INVALID_DATE');
      }

      return {
        from: date.startOf('day').toJSDate(),
        to: date.endOf('day').toJSDate(),
      };
    }

    const from = filters.from
      ? DateTime.fromISO(filters.from, { zone: timezone }).startOf('day')
      : DateTime.fromMillis(0, { zone: timezone });
    const to = filters.to
      ? DateTime.fromISO(filters.to, { zone: timezone }).endOf('day')
      : DateTime.now().setZone(timezone).plus({ years: 1 }).endOf('day');

    if (!from.isValid || !to.isValid || to < from) {
      throw new BadRequestException('INVALID_DATE_RANGE');
    }

    return {
      from: from.toJSDate(),
      to: to.toJSDate(),
    };
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
