import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSalonSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  receptionistName?: string;

  @IsOptional()
  @IsBoolean()
  receptionistEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  welcomeMessage?: string;

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
