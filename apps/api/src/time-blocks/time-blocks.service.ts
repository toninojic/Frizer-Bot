import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';

type TimeBlockRecord = {
  id: string;
  title: string;
  workerId: string | null;
  startAt: Date;
  endAt: Date;
  worker: {
    id: string;
    name: string;
  } | null;
};

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findUpcomingForSalon(salonId: string) {
    const timeBlocks = await this.prisma.workerTimeBlock.findMany({
      where: {
        salonId,
        endAt: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        workerId: true,
        startAt: true,
        endAt: true,
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    return timeBlocks.map((timeBlock) =>
      this.toTimeBlockResponse(timeBlock),
    );
  }

  async create(salonId: string, dto: CreateTimeBlockDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('startAt and endAt must be valid dates');
    }

    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const workerId = dto.workerId || null;

    if (workerId) {
      const worker = await this.prisma.worker.findFirst({
        where: {
          id: workerId,
          salonId,
        },
        select: {
          id: true,
        },
      });

      if (!worker) {
        throw new BadRequestException('workerId must belong to this salon');
      }
    }

    const timeBlock = await this.prisma.workerTimeBlock.create({
      data: {
        salonId,
        workerId,
        title: dto.title,
        startAt,
        endAt,
      },
      select: {
        id: true,
        title: true,
        workerId: true,
        startAt: true,
        endAt: true,
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return this.toTimeBlockResponse(timeBlock);
  }

  async remove(salonId: string, id: string) {
    const result = await this.prisma.workerTimeBlock.deleteMany({
      where: {
        id,
        salonId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Time block not found');
    }

    return { id };
  }

  private toTimeBlockResponse(timeBlock: TimeBlockRecord) {
    return {
      id: timeBlock.id,
      title: timeBlock.title,
      workerId: timeBlock.workerId,
      workerName: timeBlock.worker?.name ?? null,
      startAt: timeBlock.startAt.toISOString(),
      endAt: timeBlock.endAt.toISOString(),
    };
  }
}
