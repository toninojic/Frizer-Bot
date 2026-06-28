import { IsOptional, IsString, MinLength } from 'class-validator';

export class EndConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;
}
