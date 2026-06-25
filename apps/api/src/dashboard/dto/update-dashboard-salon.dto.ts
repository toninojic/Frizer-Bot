import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDashboardSalonDto {
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
  @MinLength(1)
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
