import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AvailableSlotsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  salonId?: string;

  @IsString()
  @MinLength(1)
  serviceId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workerId?: string;

  @IsDateString({ strict: true })
  date!: string;

  @IsOptional()
  @IsMilitaryTime()
  preferredTimeFrom?: string;

  @IsOptional()
  @IsMilitaryTime()
  preferredTimeTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
