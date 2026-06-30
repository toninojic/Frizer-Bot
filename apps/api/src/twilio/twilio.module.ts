import { Module } from '@nestjs/common';
import { ConversationEngineModule } from '../conversation-engine/conversation-engine.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';

@Module({
  imports: [PrismaModule, FeatureFlagsModule, ConversationEngineModule],
  controllers: [TwilioController],
  providers: [TwilioService],
})
export class TwilioModule {}
