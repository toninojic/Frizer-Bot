import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.salon.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const salon = await this.prisma.salon.findUnique({
      where: { id },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }

    return salon;
  }
}
