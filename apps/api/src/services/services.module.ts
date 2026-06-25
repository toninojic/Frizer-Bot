import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesController } from './services.controller';
import { SalonServicesService } from './services.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController],
  providers: [SalonServicesService],
})
export class SalonServicesModule {}
