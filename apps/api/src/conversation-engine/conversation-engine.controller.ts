import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InternalToolsKeyGuard } from '../tool-layer/internal-tools-key.guard';
import { ConversationEngineService } from './conversation-engine.service';
import { ConversationMessageDto } from './dto/conversation-message.dto';
import { EndConversationDto } from './dto/end-conversation.dto';
import { StartConversationDto } from './dto/start-conversation.dto';

@UseGuards(InternalToolsKeyGuard)
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationEngine: ConversationEngineService) {}

  @Post('start')
  start(@Body() dto: StartConversationDto) {
    return this.conversationEngine.startConversation(dto);
  }

  @Post(':sessionId/message')
  message(
    @Param('sessionId') sessionId: string,
    @Body() dto: ConversationMessageDto,
  ) {
    return this.conversationEngine.handleUserMessage(sessionId, dto.message);
  }

  @Post(':sessionId/end')
  end(@Param('sessionId') sessionId: string, @Body() dto: EndConversationDto) {
    return this.conversationEngine.endConversation(sessionId, dto.reason);
  }
}
