import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BookingChannel,
  DayOfWeek,
  Prisma,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

const DEFAULT_TIMEZONE = 'Europe/Belgrade';
const SLOT_GRANULARITY_MINUTES = 10;

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type SalonRecord = {
  id: string;
  name: string;
  timezone: string;
  isActive: boolean;
};

type WorkerRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

type ServiceRecord = {
  id: string;
  name: string;
  durationMinutes: number;
  isActive: boolean;
};

type BlockingInterval = {
  startAt: Date;
  endAt: Date;
};

type BookableSlot = {
  salon: SalonRecord;
  worker: WorkerRecord;
  service: ServiceRecord;
  startAt: Date;
  endAt: Date;
};

type AssertSlotInput = {
  salonId: string;
  workerId: string;
  serviceId: string;
  startAt: string | Date;
  ignoreAppointmentId?: string;
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
export class BookingEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableSlots(salonId: string, input: AvailableSlotsDto) {
    const salon = await this.getSalonOrThrow(salonId, this.prisma);
    const service = await this.getServiceOrThrow(
      salonId,
      input.serviceId,
      this.prisma,
    );
    const timezone = salon.timezone || DEFAULT_TIMEZONE;
    const workingWindow = await this.getWorkingWindowForDate(
      salonId,
      input.date,
      this.prisma,
      timezone,
    );

    if (!workingWindow) {
      return { slots: [] };
    }

    const workers = input.workerId
      ? [
          await this.getWorkerOrThrow(
            salonId,
            input.workerId,
            this.prisma,
          ),
        ]
      : await this.prisma.worker.findMany({
          where: {
            salonId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        });

    const limit = input.limit ?? 3;
    const searchStart = this.applyPreferredTime(
      workingWindow.start,
      input.date,
      input.preferredTimeFrom,
      timezone,
      'from',
    );
    const searchEnd = this.applyPreferredTime(
      workingWindow.end,
      input.date,
      input.preferredTimeTo,
      timezone,
      'to',
    );

    if (searchEnd <= searchStart) {
      return { slots: [] };
    }

    const now = DateTime.utc();
    const slots: Array<{
      workerId: string;
      workerName: string;
      startAt: string;
      endAt: string;
      label: string;
    }> = [];

    for (const worker of workers) {
      const intervals = await this.getBlockingIntervals({
        salonId,
        workerId: worker.id,
        startAt: searchStart.toJSDate(),
        endAt: searchEnd.toJSDate(),
      });
      let candidate = roundUpToGranularity(maxDateTime(searchStart, now), timezone);

      while (
        candidate.plus({ minutes: service.durationMinutes }) <= searchEnd
      ) {
        const candidateEnd = candidate.plus({
          minutes: service.durationMinutes,
        });

        if (
          !this.hasConflict(
            candidate.toJSDate(),
            candidateEnd.toJSDate(),
            intervals,
          )
        ) {
          slots.push({
            workerId: worker.id,
            workerName: worker.name,
            startAt: candidate.toUTC().toISO() ?? candidate.toJSDate().toISOString(),
            endAt: candidateEnd.toUTC().toISO() ?? candidateEnd.toJSDate().toISOString(),
            label: this.createSlotLabel(worker.name, candidate, timezone),
          });
        }

        candidate = candidate.plus({ minutes: SLOT_GRANULARITY_MINUTES });
      }
    }

    return {
      slots: slots.sort((first, second) =>
        first.startAt.localeCompare(second.startAt),
      ).slice(0, limit),
    };
  }

  async createBooking(input: BookAppointmentDto & { salonId: string }) {
    return this.runSerializable(async (tx) => {
      const bookableSlot = await this.assertSlotIsBookable(
        {
          salonId: input.salonId,
          workerId: input.workerId,
          serviceId: input.serviceId,
          startAt: input.startAt,
        },
        tx,
      );

      const customer = await tx.customer.upsert({
        where: {
          salonId_phone: {
            salonId: input.salonId,
            phone: input.customerPhone,
          },
        },
        update: {
          name: input.customerName,
        },
        create: {
          salonId: input.salonId,
          name: input.customerName,
          phone: input.customerPhone,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          salonId: input.salonId,
          workerId: bookableSlot.worker.id,
          customerId: customer.id,
          serviceId: bookableSlot.service.id,
          customerNameSnapshot: customer.name,
          customerPhoneSnapshot: customer.phone,
          serviceNameSnapshot: bookableSlot.service.name,
          workerNameSnapshot: bookableSlot.worker.name,
          startAt: bookableSlot.startAt,
          endAt: bookableSlot.endAt,
          status: AppointmentStatus.BOOKED,
          channel: input.channel ?? BookingChannel.MANUAL,
          notes: input.notes,
        },
      });

      return this.toAppointmentResponse(appointment);
    });
  }

  async cancelBooking(input: CancelBookingDto & { salonId: string }) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: input.appointmentId,
        salonId: input.salonId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status !== AppointmentStatus.BOOKED) {
      throw new BadRequestException('APPOINTMENT_NOT_BOOKED');
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        status: AppointmentStatus.CANCELLED,
        notes: input.reason
          ? [appointment.notes, `Cancel reason: ${input.reason}`]
              .filter(Boolean)
              .join('\n')
          : appointment.notes,
      },
    });

    return this.toAppointmentResponse(updatedAppointment);
  }

  async rescheduleBooking(input: RescheduleBookingDto & { salonId: string }) {
    return this.runSerializable(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: input.appointmentId,
          salonId: input.salonId,
        },
      });

      if (!appointment) {
        throw new NotFoundException('APPOINTMENT_NOT_FOUND');
      }

      if (appointment.status !== AppointmentStatus.BOOKED) {
        throw new BadRequestException('APPOINTMENT_NOT_BOOKED');
      }

      const workerId = input.workerId ?? appointment.workerId;
      const bookableSlot = await this.assertSlotIsBookable(
        {
          salonId: input.salonId,
          workerId,
          serviceId: appointment.serviceId,
          startAt: input.newStartAt,
          ignoreAppointmentId: appointment.id,
        },
        tx,
      );

      const updatedAppointment = await tx.appointment.update({
        where: {
          id: appointment.id,
        },
        data: {
          workerId: bookableSlot.worker.id,
          workerNameSnapshot: bookableSlot.worker.name,
          startAt: bookableSlot.startAt,
          endAt: bookableSlot.endAt,
        },
      });

      return this.toAppointmentResponse(updatedAppointment);
    });
  }

  async assertSlotIsBookable(
    input: AssertSlotInput,
    client: PrismaClientLike = this.prisma,
  ): Promise<BookableSlot> {
    const salon = await this.getSalonOrThrow(input.salonId, client);
    const worker = await this.getWorkerOrThrow(
      input.salonId,
      input.workerId,
      client,
    );
    const service = await this.getServiceOrThrow(
      input.salonId,
      input.serviceId,
      client,
    );
    const startAt = normalizeDate(input.startAt);
    const endAt = new Date(
      startAt.getTime() + service.durationMinutes * 60_000,
    );

    if (startAt <= new Date()) {
      throw new BadRequestException('SLOT_IN_PAST');
    }

    const timezone = salon.timezone || DEFAULT_TIMEZONE;
    const localDate = DateTime.fromJSDate(startAt, { zone: timezone }).toISODate();

    if (!localDate) {
      throw new BadRequestException('INVALID_START_AT');
    }

    const workingWindow = await this.getWorkingWindowForDate(
      input.salonId,
      localDate,
      client,
      timezone,
    );

    if (
      !workingWindow ||
      startAt < workingWindow.start.toJSDate() ||
      endAt > workingWindow.end.toJSDate()
    ) {
      throw new BadRequestException('SALON_CLOSED');
    }

    const blockingIntervals = await this.getBlockingIntervals(
      {
        salonId: input.salonId,
        workerId: worker.id,
        startAt,
        endAt,
        ignoreAppointmentId: input.ignoreAppointmentId,
      },
      client,
    );

    const blockedByTimeBlock = blockingIntervals.some((interval) =>
      intervalsOverlap(startAt, endAt, interval.startAt, interval.endAt),
    );

    if (blockedByTimeBlock) {
      const appointmentConflict = await this.hasAppointmentConflict(
        {
          salonId: input.salonId,
          workerId: worker.id,
          startAt,
          endAt,
          ignoreAppointmentId: input.ignoreAppointmentId,
        },
        client,
      );

      throw new BadRequestException(
        appointmentConflict ? 'SLOT_CONFLICT' : 'SLOT_BLOCKED',
      );
    }

    return {
      salon,
      worker,
      service,
      startAt,
      endAt,
    };
  }

  async getWorkingWindowForDate(
    salonId: string,
    date: string,
    client: PrismaClientLike = this.prisma,
    timezone = DEFAULT_TIMEZONE,
  ) {
    const localDate = DateTime.fromISO(date, { zone: timezone });

    if (!localDate.isValid) {
      throw new BadRequestException('INVALID_DATE');
    }

    const workingHour = await client.workingHour.findFirst({
      where: {
        salonId,
        dayOfWeek: dayOfWeekFromDate(localDate),
      },
      select: {
        opensAt: true,
        closesAt: true,
        isClosed: true,
      },
    });

    if (
      !workingHour ||
      workingHour.isClosed ||
      !workingHour.opensAt ||
      !workingHour.closesAt
    ) {
      return null;
    }

    return {
      start: localDateTime(date, workingHour.opensAt, timezone),
      end: localDateTime(date, workingHour.closesAt, timezone),
    };
  }

  async getBlockingIntervals(
    input: {
      salonId: string;
      workerId: string;
      startAt: Date;
      endAt: Date;
      ignoreAppointmentId?: string;
    },
    client: PrismaClientLike = this.prisma,
  ): Promise<BlockingInterval[]> {
    const [appointments, timeBlocks] = await Promise.all([
      client.appointment.findMany({
        where: {
          salonId: input.salonId,
          workerId: input.workerId,
          status: AppointmentStatus.BOOKED,
          id: input.ignoreAppointmentId
            ? {
                not: input.ignoreAppointmentId,
              }
            : undefined,
          startAt: {
            lt: input.endAt,
          },
          endAt: {
            gt: input.startAt,
          },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      }),
      client.workerTimeBlock.findMany({
        where: {
          salonId: input.salonId,
          OR: [
            {
              workerId: null,
            },
            {
              workerId: input.workerId,
            },
          ],
          startAt: {
            lt: input.endAt,
          },
          endAt: {
            gt: input.startAt,
          },
        },
        select: {
          startAt: true,
          endAt: true,
        },
      }),
    ]);

    return [...appointments, ...timeBlocks];
  }

  hasConflict(startAt: Date, endAt: Date, intervals: BlockingInterval[]) {
    return intervals.some((interval) =>
      intervalsOverlap(startAt, endAt, interval.startAt, interval.endAt),
    );
  }

  private async hasAppointmentConflict(
    input: {
      salonId: string;
      workerId: string;
      startAt: Date;
      endAt: Date;
      ignoreAppointmentId?: string;
    },
    client: PrismaClientLike,
  ) {
    const count = await client.appointment.count({
      where: {
        salonId: input.salonId,
        workerId: input.workerId,
        status: AppointmentStatus.BOOKED,
        id: input.ignoreAppointmentId
          ? {
              not: input.ignoreAppointmentId,
            }
          : undefined,
        startAt: {
          lt: input.endAt,
        },
        endAt: {
          gt: input.startAt,
        },
      },
    });

    return count > 0;
  }

  private async getSalonOrThrow(
    salonId: string,
    client: PrismaClientLike,
  ): Promise<SalonRecord> {
    const salon = await client.salon.findFirst({
      where: {
        id: salonId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
        isActive: true,
      },
    });

    if (!salon) {
      throw new NotFoundException('SALON_NOT_FOUND');
    }

    return salon;
  }

  private async getWorkerOrThrow(
    salonId: string,
    workerId: string,
    client: PrismaClientLike,
  ): Promise<WorkerRecord> {
    const worker = await client.worker.findFirst({
      where: {
        id: workerId,
        salonId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('WORKER_NOT_FOUND');
    }

    return worker;
  }

  private async getServiceOrThrow(
    salonId: string,
    serviceId: string,
    client: PrismaClientLike,
  ): Promise<ServiceRecord> {
    const service = await client.service.findFirst({
      where: {
        id: serviceId,
        salonId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('SERVICE_NOT_FOUND');
    }

    return service;
  }

  private applyPreferredTime(
    fallback: DateTime,
    date: string,
    time: string | undefined,
    timezone: string,
    mode: 'from' | 'to',
  ) {
    if (!time) {
      return fallback;
    }

    const preferred = localDateTime(date, time, timezone);

    return mode === 'from'
      ? maxDateTime(fallback, preferred)
      : minDateTime(fallback, preferred);
  }

  private createSlotLabel(workerName: string, startAt: DateTime, timezone: string) {
    const localStart = startAt.setZone(timezone);
    const today = DateTime.now().setZone(timezone).toISODate();
    const dateLabel =
      localStart.toISODate() === today
        ? 'danas'
        : localStart.setLocale('sr-Latn').toFormat('dd.LL.');

    return `${workerName} ${dateLabel} u ${localStart.toFormat('HH:mm')}`;
  }

  private async runSerializable<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new BadRequestException('SLOT_CONFLICT');
      }

      throw error;
    }
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

export function intervalsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

function normalizeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('INVALID_DATE');
  }

  return date;
}

function dayOfWeekFromDate(date: DateTime) {
  const byWeekday: Record<number, DayOfWeek> = {
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
    7: DayOfWeek.SUNDAY,
  };

  return byWeekday[date.weekday];
}

function localDateTime(date: string, time: string, timezone: string) {
  const value = DateTime.fromISO(`${date}T${time}`, {
    zone: timezone || DEFAULT_TIMEZONE,
  });

  if (!value.isValid) {
    throw new BadRequestException('INVALID_DATE');
  }

  return value;
}

function maxDateTime(first: DateTime, second: DateTime) {
  return first.toMillis() >= second.toMillis() ? first : second;
}

function minDateTime(first: DateTime, second: DateTime) {
  return first.toMillis() <= second.toMillis() ? first : second;
}

function roundUpToGranularity(date: DateTime, timezone: string) {
  const zoned = date.setZone(timezone || DEFAULT_TIMEZONE);
  const minute = zoned.minute;
  const remainder = minute % SLOT_GRANULARITY_MINUTES;

  if (
    remainder === 0 &&
    zoned.second === 0 &&
    zoned.millisecond === 0
  ) {
    return zoned;
  }

  return zoned
    .plus({ minutes: SLOT_GRANULARITY_MINUTES - remainder })
    .set({ second: 0, millisecond: 0 });
}
