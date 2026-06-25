import { Injectable, NotFoundException } from '@nestjs/common';
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
}
