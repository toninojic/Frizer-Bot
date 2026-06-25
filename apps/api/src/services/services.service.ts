import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class SalonServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForSalon(salonId: string) {
    return this.prisma.service.findMany({
      where: { salonId },
      orderBy: { name: 'asc' },
    });
  }

  create(salonId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        salonId,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        priceAmount: dto.priceAmount,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(salonId: string, id: string, dto: UpdateServiceDto) {
    const result = await this.prisma.service.updateMany({
      where: { id, salonId },
      data: {
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        priceAmount: dto.priceAmount,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Service not found');
    }

    return this.findOneForSalon(salonId, id);
  }

  async remove(salonId: string, id: string) {
    const result = await this.prisma.service.updateMany({
      where: { id, salonId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Service not found');
    }

    return this.findOneForSalon(salonId, id);
  }

  private async findOneForSalon(salonId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, salonId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }
}
