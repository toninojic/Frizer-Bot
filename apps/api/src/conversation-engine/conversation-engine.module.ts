import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalToolsKeyGuard } from '../tool-layer/internal-tools-key.guard';
import { ToolLayerModule } from '../tool-layer/tool-layer.module';
import { ConversationController } from './conversation-engine.controller';
import { ConversationEngineService } from './conversation-engine.service';
import { ConversationSessionService } from './conversation-session.service';
import { ConversationStateMachine } from './conversation-state-machine';

@Module({
  imports: [PrismaModule, ToolLayerModule],
  controllers: [ConversationController],
  providers: [
    ConversationEngineService,
    ConversationSessionService,
    ConversationStateMachine,
    InternalToolsKeyGuard,
  ],
  exports: [ConversationEngineService],
})
export class ConversationEngineModule {}
