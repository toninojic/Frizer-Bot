import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForSalon(salonId: string, search?: string) {
    const normalizedSearch = search?.trim();

    return this.prisma.customer.findMany({
      where: {
        salonId,
        OR: normalizedSearch
          ? [
              {
                name: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(salonId: string, dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: {
          salonId,
          name: dto.name,
          phone: dto.phone,
        },
      });
    } catch (error) {
      this.throwConflictOnDuplicatePhone(error);
      throw error;
    }
  }

  async update(salonId: string, id: string, dto: UpdateCustomerDto) {
    try {
      const result = await this.prisma.customer.updateMany({
        where: { id, salonId },
        data: {
          name: dto.name,
          phone: dto.phone,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Customer not found');
      }

      return await this.findOneForSalon(salonId, id);
    } catch (error) {
      this.throwConflictOnDuplicatePhone(error);
      throw error;
    }
  }

  async findOneForSalon(salonId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, salonId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private throwConflictOnDuplicatePhone(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Customer phone already exists for salon');
    }
  }
}
