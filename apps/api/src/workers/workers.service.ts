import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForSalon(salonId: string) {
    return this.prisma.worker.findMany({
      where: { salonId },
      orderBy: { name: 'asc' },
    });
  }

  create(salonId: string, dto: CreateWorkerDto) {
    return this.prisma.worker.create({
      data: {
        salonId,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(salonId: string, id: string, dto: UpdateWorkerDto) {
    const result = await this.prisma.worker.updateMany({
      where: { id, salonId },
      data: {
        name: dto.name,
        isActive: dto.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Worker not found');
    }

    return this.findOneForSalon(salonId, id);
  }

  async remove(salonId: string, id: string) {
    const result = await this.prisma.worker.updateMany({
      where: { id, salonId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Worker not found');
    }

    return this.findOneForSalon(salonId, id);
  }

  private async findOneForSalon(salonId: string, id: string) {
    const worker = await this.prisma.worker.findFirst({
      where: { id, salonId },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    return worker;
  }
}
