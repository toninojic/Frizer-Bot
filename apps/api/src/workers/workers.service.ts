import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';

type WorkerRecord = {
  id: string;
  name: string;
  isActive: boolean;
};

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForSalon(salonId: string) {
    const workers = await this.prisma.worker.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return workers.map((worker) => this.toWorkerResponse(worker));
  }

  async create(salonId: string, dto: CreateWorkerDto) {
    const worker = await this.prisma.worker.create({
      data: {
        salonId,
        name: dto.name,
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return this.toWorkerResponse(worker);
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
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    return this.toWorkerResponse(worker);
  }

  private toWorkerResponse(worker: WorkerRecord) {
    return {
      id: worker.id,
      name: worker.name,
      isActive: worker.isActive,
    };
  }
}
