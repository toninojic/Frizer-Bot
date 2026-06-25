import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMilitaryTime,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class WorkingHourDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsOptional()
  @IsMilitaryTime()
  opensAt?: string;

  @IsOptional()
  @IsMilitaryTime()
  closesAt?: string;

  @IsBoolean()
  isClosed!: boolean;
}

export class ReplaceWorkingHoursDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  hours!: WorkingHourDto[];
}
