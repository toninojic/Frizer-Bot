import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReplaceWorkingHoursDto, WorkingHourDto } from './dto/replace-working-hours.dto';

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForSalon(salonId: string) {
    return this.prisma.workingHour.findMany({
      where: { salonId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async replaceForSalon(salonId: string, dto: ReplaceWorkingHoursDto) {
    const normalizedHours = this.normalize(dto.hours);

    await this.prisma.$transaction(
      normalizedHours.map((workingHour) =>
        this.prisma.workingHour.upsert({
          where: {
            salonId_dayOfWeek: {
              salonId,
              dayOfWeek: workingHour.dayOfWeek,
            },
          },
          update: {
            opensAt: workingHour.opensAt,
            closesAt: workingHour.closesAt,
            isClosed: workingHour.isClosed,
          },
          create: {
            salonId,
            dayOfWeek: workingHour.dayOfWeek,
            opensAt: workingHour.opensAt,
            closesAt: workingHour.closesAt,
            isClosed: workingHour.isClosed,
          },
        }),
      ),
    );

    return this.findAllForSalon(salonId);
  }

  private normalize(hours: WorkingHourDto[]) {
    const seenDays = new Set<string>();

    return hours.map((workingHour) => {
      if (seenDays.has(workingHour.dayOfWeek)) {
        throw new BadRequestException(
          `Duplicate working hours for ${workingHour.dayOfWeek}`,
        );
      }

      seenDays.add(workingHour.dayOfWeek);

      if (workingHour.isClosed) {
        return {
          ...workingHour,
          opensAt: null,
          closesAt: null,
        };
      }

      if (!workingHour.opensAt || !workingHour.closesAt) {
        throw new BadRequestException(
          `Open days require opensAt and closesAt for ${workingHour.dayOfWeek}`,
        );
      }

      if (workingHour.opensAt >= workingHour.closesAt) {
        throw new BadRequestException(
          `opensAt must be before closesAt for ${workingHour.dayOfWeek}`,
        );
      }

      return workingHour;
    });
  }
}
