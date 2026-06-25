import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

type ServiceRecord = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: Prisma.Decimal | null;
  isActive: boolean;
};

@Injectable()
export class SalonServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForSalon(salonId: string) {
    const services = await this.prisma.service.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceAmount: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return services.map((service) => this.toServiceResponse(service));
  }

  async create(salonId: string, dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: {
        salonId,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        priceAmount: dto.priceAmount,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceAmount: true,
        isActive: true,
      },
    });

    return this.toServiceResponse(service);
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
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceAmount: true,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.toServiceResponse(service);
  }

  private toServiceResponse(service: ServiceRecord) {
    return {
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount?.toNumber() ?? null,
      isActive: service.isActive,
    };
  }
}
