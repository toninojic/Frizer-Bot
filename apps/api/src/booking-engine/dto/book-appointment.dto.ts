import { BookingChannel } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BookAppointmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  salonId?: string;

  @IsString()
  @MinLength(1)
  workerId!: string;

  @IsString()
  @MinLength(1)
  serviceId!: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsString()
  @MinLength(3)
  customerPhone!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsEnum(BookingChannel)
  channel?: BookingChannel;

  @IsOptional()
  @IsString()
  notes?: string;
}
