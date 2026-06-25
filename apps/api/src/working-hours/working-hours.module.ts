import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService],
})
export class WorkingHoursModule {}
