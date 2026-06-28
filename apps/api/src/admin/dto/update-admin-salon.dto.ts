import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAdminSalonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  receptionistName?: string | null;

  @IsOptional()
  @IsBoolean()
  receptionistEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(3)
  transferPhone?: string | null;

  @IsOptional()
  @IsBoolean()
  workingAfterHoursEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsConfirmationsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reminderHoursBefore?: number;
}
