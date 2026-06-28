import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationChannel } from '@prisma/client';

const phonePattern = /^\+?[0-9\s().-]{6,}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BaseToolInputDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  salonId?: string;

  @IsOptional()
  @IsEnum(ConversationChannel)
  channel?: ConversationChannel;
}

export class GetSalonContextToolInputDto extends BaseToolInputDto {}

export class FindAvailableSlotsToolInputDto extends BaseToolInputDto {
  @IsString()
  @MinLength(1)
  serviceId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workerId?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @Matches(timePattern)
  preferredTimeFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(timePattern)
  preferredTimeTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class BookAppointmentToolInputDto extends BaseToolInputDto {
  @IsString()
  @MinLength(1)
  workerId!: string;

  @IsString()
  @MinLength(1)
  serviceId!: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsString()
  @Matches(phonePattern)
  customerPhone!: string;

  @IsDateString()
  startAt!: string;
}

export class CancelAppointmentToolInputDto extends BaseToolInputDto {
  @IsString()
  @Matches(phonePattern)
  customerPhone!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  appointmentId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}

export class RescheduleAppointmentToolInputDto extends BaseToolInputDto {
  @IsString()
  @Matches(phonePattern)
  customerPhone!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  appointmentId?: string;

  @IsDateString()
  newStartAt!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  workerId?: string;
}

export class FindCustomerToolInputDto extends BaseToolInputDto {
  @IsString()
  @Matches(phonePattern)
  phone!: string;
}

export class FindUpcomingAppointmentsForCustomerToolInputDto extends BaseToolInputDto {
  @IsString()
  @Matches(phonePattern)
  phone!: string;
}

export class TransferCallToolInputDto extends BaseToolInputDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class LogConversationEventToolInputDto extends BaseToolInputDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  conversationId?: string;

  @IsString()
  @MinLength(1)
  eventType!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
