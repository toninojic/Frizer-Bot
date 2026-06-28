import { Module } from '@nestjs/common';
import { BookingEngineModule } from '../booking-engine/booking-engine.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalToolsKeyGuard } from './internal-tools-key.guard';
import { ToolLayerController } from './tool-layer.controller';
import { ToolLayerService } from './tool-layer.service';

@Module({
  imports: [PrismaModule, BookingEngineModule, FeatureFlagsModule],
  controllers: [ToolLayerController],
  providers: [ToolLayerService, InternalToolsKeyGuard],
  exports: [ToolLayerService],
})
export class ToolLayerModule {}
