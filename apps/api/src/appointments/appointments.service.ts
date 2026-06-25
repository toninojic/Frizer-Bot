import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, BookingChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForSalon(salonId: string) {
    return this.prisma.appointment.findMany({
      where: { salonId },
      include: {
        worker: true,
        customer: true,
        service: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async create(salonId: string, dto: CreateAppointmentDto) {
    const startAt = new Date(dto.startAt);
    const worker = await this.prisma.worker.findFirst({
      where: {
        id: dto.workerId,
        salonId,
        isActive: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found for salon');
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        salonId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found for salon');
    }

    const endAt = dto.endAt
      ? new Date(dto.endAt)
      : new Date(startAt.getTime() + service.durationMinutes * 60_000);

    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: {
          salonId_phone: {
            salonId,
            phone: dto.customerPhone,
          },
        },
        update: {
          name: dto.customerName,
        },
        create: {
          salonId,
          name: dto.customerName,
          phone: dto.customerPhone,
        },
      });

      return tx.appointment.create({
        data: {
          salonId,
          workerId: worker.id,
          customerId: customer.id,
          serviceId: service.id,
          customerNameSnapshot: customer.name,
          customerPhoneSnapshot: customer.phone,
          serviceNameSnapshot: service.name,
          workerNameSnapshot: worker.name,
          startAt,
          endAt,
          status: AppointmentStatus.BOOKED,
          channel: dto.channel ?? BookingChannel.MANUAL,
          notes: dto.notes,
        },
      });
    });
  }

  async cancel(salonId: string, id: string) {
    const result = await this.prisma.appointment.updateMany({
      where: { id, salonId },
      data: { status: AppointmentStatus.CANCELLED },
    });

    if (result.count === 0) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.appointment.findFirst({
      where: { id, salonId },
    });
  }
}
