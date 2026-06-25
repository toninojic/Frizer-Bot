import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
