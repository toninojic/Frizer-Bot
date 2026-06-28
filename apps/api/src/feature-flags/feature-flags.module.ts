import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardFeaturesController } from './dashboard-features.controller';
import { FeatureFlagsService } from './feature-flags.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardFeaturesController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
