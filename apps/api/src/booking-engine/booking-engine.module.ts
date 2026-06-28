import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingEngineController } from './booking-engine.controller';
import { BookingEngineService } from './booking-engine.service';
import { DashboardBookingController } from './dashboard-booking.controller';

@Module({
  imports: [PrismaModule, FeatureFlagsModule],
  controllers: [BookingEngineController, DashboardBookingController],
  providers: [BookingEngineService],
  exports: [BookingEngineService],
})
export class BookingEngineModule {}
