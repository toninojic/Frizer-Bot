import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminSalonDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(3)
  phone!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  twilioPhoneNumber?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  timezone?: string;
}
