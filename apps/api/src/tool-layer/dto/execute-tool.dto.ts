import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ConversationChannel } from '@prisma/client';

export enum ToolName {
  GET_SALON_CONTEXT = 'getSalonContext',
  FIND_AVAILABLE_SLOTS = 'findAvailableSlots',
  BOOK_APPOINTMENT = 'bookAppointment',
  CANCEL_APPOINTMENT = 'cancelAppointment',
  RESCHEDULE_APPOINTMENT = 'rescheduleAppointment',
  FIND_CUSTOMER = 'findCustomer',
  FIND_UPCOMING_APPOINTMENTS_FOR_CUSTOMER = 'findUpcomingAppointmentsForCustomer',
  TRANSFER_CALL = 'transferCall',
  LOG_CONVERSATION_EVENT = 'logConversationEvent',
}

export class ToolContextDto {
  @IsString()
  @MinLength(1)
  salonId!: string;

  @IsEnum(ConversationChannel)
  channel!: ConversationChannel;

  @IsOptional()
  @IsString()
  @MinLength(1)
  conversationId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s().-]{6,}$/)
  customerPhone?: string;
}

export class ExecuteToolDto {
  @IsString()
  @MinLength(1)
  toolName!: string;

  @ValidateNested()
  @Type(() => ToolContextDto)
  context!: ToolContextDto;

  @IsObject()
  input!: Record<string, unknown>;
}
