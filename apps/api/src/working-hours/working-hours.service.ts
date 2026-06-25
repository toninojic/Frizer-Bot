import { BadRequestException, Injectable } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReplaceWorkingHoursDto, WorkingHourDto } from './dto/replace-working-hours.dto';

const orderedDays: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

type WorkingHourRecord = {
  id: string;
  dayOfWeek: DayOfWeek;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForSalon(salonId: string) {
    const workingHours = await this.prisma.workingHour.findMany({
      where: { salonId },
      select: {
        id: true,
        dayOfWeek: true,
        opensAt: true,
        closesAt: true,
        isClosed: true,
      },
    });

    return workingHours
      .map((workingHour) => this.toWorkingHourResponse(workingHour))
      .sort(
        (first, second) =>
          orderedDays.indexOf(first.dayOfWeek) -
          orderedDays.indexOf(second.dayOfWeek),
      );
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

    const normalizedHours = hours.map((workingHour) => {
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

    const missingDays = orderedDays.filter((day) => !seenDays.has(day));

    if (missingDays.length > 0) {
      throw new BadRequestException(
        `Missing working hours for ${missingDays.join(', ')}`,
      );
    }

    return normalizedHours;
  }

  private toWorkingHourResponse(workingHour: WorkingHourRecord) {
    return {
      id: workingHour.id,
      dayOfWeek: workingHour.dayOfWeek,
      opensAt: workingHour.opensAt,
      closesAt: workingHour.closesAt,
      isClosed: workingHour.isClosed,
    };
  }
}
