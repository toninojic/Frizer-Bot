import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { TimeBlocksService } from './time-blocks.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/time-blocks')
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Get()
  findUpcomingForSalon(@CurrentSalonId() salonId: string) {
    return this.timeBlocksService.findUpcomingForSalon(salonId);
  }

  @Post()
  create(
    @CurrentSalonId() salonId: string,
    @Body() dto: CreateTimeBlockDto,
  ) {
    return this.timeBlocksService.create(salonId, dto);
  }

  @Delete(':id')
  remove(@CurrentSalonId() salonId: string, @Param('id') id: string) {
    return this.timeBlocksService.remove(salonId, id);
  }
}
