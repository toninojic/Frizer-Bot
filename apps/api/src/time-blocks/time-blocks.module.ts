import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TimeBlocksController } from './time-blocks.controller';
import { TimeBlocksService } from './time-blocks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService],
})
export class TimeBlocksModule {}
