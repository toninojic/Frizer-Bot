import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { TimeBlocksService } from './time-blocks.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/time-blocks')
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Get()
  findUpcomingForSalon(@CurrentUser() user: AuthenticatedUser) {
    return this.timeBlocksService.findUpcomingForSalon(user.salonId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTimeBlockDto,
  ) {
    return this.timeBlocksService.create(user.salonId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.timeBlocksService.remove(user.salonId, id);
  }
}
