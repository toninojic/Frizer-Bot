import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ConversationChannel } from '@prisma/client';

export class StartConversationDto {
  @IsString()
  @MinLength(1)
  salonId!: string;

  @IsEnum(ConversationChannel)
  channel!: ConversationChannel;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s().-]{6,}$/)
  customerPhone?: string;
}
