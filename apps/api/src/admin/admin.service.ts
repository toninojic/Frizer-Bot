import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DayOfWeek, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DateTime } from 'luxon';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminSalonDto } from './dto/create-admin-salon.dto';
import { UpdateAdminSalonDto } from './dto/update-admin-salon.dto';

const DEFAULT_TIMEZONE = 'Europe/Belgrade';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async overview() {
    const today = this.dayRange(DEFAULT_TIMEZONE);
    const month = this.monthRange(DEFAULT_TIMEZONE);

    const [
      totalSalons,
      activeSalons,
      totalAppointmentsToday,
      totalCallsToday,
      totalSmsThisMonth,
    ] = await Promise.all([
      this.prisma.salon.count(),
      this.prisma.salon.count({ where: { isActive: true } }),
      this.prisma.appointment.count({
        where: { startAt: { gte: today.from, lte: today.to } },
      }),
      this.prisma.callLog.count({
        where: { startedAt: { gte: today.from, lte: today.to } },
      }),
      this.prisma.smsLog.count({
        where: { createdAt: { gte: month.from, lte: month.to } },
      }),
    ]);

    return {
      totalSalons,
      activeSalons,
      totalAppointmentsToday,
      totalCallsToday,
      totalSmsThisMonth,
    };
  }

  async findSalons() {
    const salons = await this.prisma.salon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            workers: true,
            services: true,
          },
        },
      },
    });

    return Promise.all(
      salons.map(async (salon) => {
        const today = this.dayRange(salon.timezone || DEFAULT_TIMEZONE);
        const [appointmentsToday, callsToday] = await Promise.all([
          this.prisma.appointment.count({
            where: {
              salonId: salon.id,
              startAt: { gte: today.from, lte: today.to },
            },
          }),
          this.prisma.callLog.count({
            where: {
              salonId: salon.id,
              startedAt: { gte: today.from, lte: today.to },
            },
          }),
        ]);

        return {
          id: salon.id,
          name: salon.name,
          phone: salon.phone,
          city: salon.city,
          isActive: salon.isActive,
          receptionistEnabled: salon.receptionistEnabled,
          workersCount: salon._count.workers,
          servicesCount: salon._count.services,
          appointmentsToday,
          callsToday,
          createdAt: salon.createdAt.toISOString(),
        };
      }),
    );
  }

  async findSalon(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
      include: {
        workers: { orderBy: { createdAt: 'asc' } },
        services: { orderBy: { createdAt: 'asc' } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    const today = this.dayRange(salon.timezone || DEFAULT_TIMEZONE);
    const month = this.monthRange(salon.timezone || DEFAULT_TIMEZONE);
    const [
      appointmentsToday,
      appointmentsThisMonth,
      callsToday,
      callsThisMonth,
      smsThisMonth,
    ] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          salonId: id,
          startAt: { gte: today.from, lte: today.to },
        },
      }),
      this.prisma.appointment.count({
        where: {
          salonId: id,
          startAt: { gte: month.from, lte: month.to },
        },
      }),
      this.prisma.callLog.count({
        where: {
          salonId: id,
          startedAt: { gte: today.from, lte: today.to },
        },
      }),
      this.prisma.callLog.count({
        where: {
          salonId: id,
          startedAt: { gte: month.from, lte: month.to },
        },
      }),
      this.prisma.smsLog.count({
        where: {
          salonId: id,
          createdAt: { gte: month.from, lte: month.to },
        },
      }),
    ]);

    return {
      id: salon.id,
      name: salon.name,
      phone: salon.phone,
      city: salon.city,
      timezone: salon.timezone,
      isActive: salon.isActive,
      receptionistName: salon.receptionistName,
      receptionistEnabled: salon.receptionistEnabled,
      transferPhone: salon.transferPhone,
      workingAfterHoursEnabled: salon.workingAfterHoursEnabled,
      smsConfirmationsEnabled: salon.smsConfirmationsEnabled,
      reminderHoursBefore: salon.reminderHoursBefore,
      createdAt: salon.createdAt.toISOString(),
      workers: salon.workers.map((worker) => ({
        id: worker.id,
        name: worker.name,
        isActive: worker.isActive,
      })),
      services: salon.services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceAmount: service.priceAmount ? Number(service.priceAmount) : null,
        isActive: service.isActive,
      })),
      workingHours: salon.workingHours.map((workingHour) => ({
        id: workingHour.id,
        dayOfWeek: workingHour.dayOfWeek,
        opensAt: workingHour.opensAt,
        closesAt: workingHour.closesAt,
        isClosed: workingHour.isClosed,
      })),
      usage: {
        appointmentsToday,
        appointmentsThisMonth,
        callsToday,
        callsThisMonth,
        smsThisMonth,
      },
    };
  }

  async updateSalon(id: string, dto: UpdateAdminSalonDto) {
    try {
      await this.prisma.salon.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (this.isKnownPrismaError(error, 'P2025')) {
        throw new NotFoundException('Salon not found');
      }

      throw error;
    }

    return this.findSalon(id);
  }

  async createSalon(dto: CreateAdminSalonDto) {
    const ownerEmail = dto.ownerEmail.trim().toLowerCase();
    const timezone = dto.timezone?.trim() || DEFAULT_TIMEZONE;
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    try {
      const salon = await this.prisma.$transaction(async (tx) => {
        const createdSalon = await tx.salon.create({
          data: {
            name: dto.name.trim(),
            phone: dto.phone.trim(),
            city: dto.city?.trim() || null,
            timezone,
            isActive: true,
            receptionistName: null,
            receptionistEnabled: false,
            transferPhone: dto.phone.trim(),
            workingAfterHoursEnabled: false,
            smsConfirmationsEnabled: true,
            reminderHoursBefore: 2,
          },
        });

        await tx.user.create({
          data: {
            email: ownerEmail,
            passwordHash,
            role: UserRole.SALON_OWNER,
            salonId: createdSalon.id,
          },
        });

        await this.createDefaultWorkingHours(tx, createdSalon.id);
        await this.featureFlagsService.ensureDefaultFeaturesForSalon(
          createdSalon.id,
          tx,
        );

        return createdSalon;
      });

      return this.findSalon(salon.id);
    } catch (error) {
      if (this.isKnownPrismaError(error, 'P2002')) {
        throw new ConflictException('Owner email already exists');
      }

      throw error;
    }
  }

  private createDefaultWorkingHours(
    tx: Prisma.TransactionClient,
    salonId: string,
  ) {
    const workingHours = [
      { dayOfWeek: DayOfWeek.MONDAY, opensAt: '09:00', closesAt: '18:00' },
      { dayOfWeek: DayOfWeek.TUESDAY, opensAt: '09:00', closesAt: '18:00' },
      { dayOfWeek: DayOfWeek.WEDNESDAY, opensAt: '09:00', closesAt: '18:00' },
      { dayOfWeek: DayOfWeek.THURSDAY, opensAt: '09:00', closesAt: '18:00' },
      { dayOfWeek: DayOfWeek.FRIDAY, opensAt: '09:00', closesAt: '18:00' },
      { dayOfWeek: DayOfWeek.SATURDAY, opensAt: '09:00', closesAt: '14:00' },
      { dayOfWeek: DayOfWeek.SUNDAY, opensAt: null, closesAt: null },
    ];

    return tx.workingHour.createMany({
      data: workingHours.map((workingHour) => ({
        salonId,
        dayOfWeek: workingHour.dayOfWeek,
        opensAt: workingHour.opensAt,
        closesAt: workingHour.closesAt,
        isClosed: workingHour.dayOfWeek === DayOfWeek.SUNDAY,
      })),
    });
  }

  private dayRange(timezone: string) {
    const now = DateTime.now().setZone(timezone);

    return {
      from: now.startOf('day').toJSDate(),
      to: now.endOf('day').toJSDate(),
    };
  }

  private monthRange(timezone: string) {
    const now = DateTime.now().setZone(timezone);

    return {
      from: now.startOf('month').toJSDate(),
      to: now.endOf('month').toJSDate(),
    };
  }

  private isKnownPrismaError(error: unknown, code: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }
}
