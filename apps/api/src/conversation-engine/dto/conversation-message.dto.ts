import { IsString, MinLength } from 'class-validator';

export class ConversationMessageDto {
  @IsString()
  @MinLength(1)
  message!: string;
}
