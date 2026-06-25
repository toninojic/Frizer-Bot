import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardSalonController } from './dashboard-salon.controller';
import { DashboardSalonService } from './dashboard-salon.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardSalonController],
  providers: [DashboardSalonService],
})
export class DashboardModule {}
