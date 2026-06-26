import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RescheduleBookingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  salonId?: string;

  @IsString()
  @MinLength(1)
  appointmentId!: string;

  @IsDateString()
  newStartAt!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workerId?: string;
}
