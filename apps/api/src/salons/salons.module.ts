import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalonsController } from './salons.controller';
import { SalonsService } from './salons.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalonsController],
  providers: [SalonsService],
})
export class SalonsModule {}
