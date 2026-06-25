import {
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTimeBlockDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workerId?: string | null;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}
