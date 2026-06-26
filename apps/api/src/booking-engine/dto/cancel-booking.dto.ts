import { IsOptional, IsString, MinLength } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  salonId?: string;

  @IsString()
  @MinLength(1)
  appointmentId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
