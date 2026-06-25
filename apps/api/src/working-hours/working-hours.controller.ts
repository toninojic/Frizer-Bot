import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReplaceWorkingHoursDto } from './dto/replace-working-hours.dto';
import { WorkingHoursService } from './working-hours.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  findAllForSalon(@CurrentUser() user: AuthenticatedUser) {
    return this.workingHoursService.findAllForSalon(user.salonId);
  }

  @Put()
  replaceForSalon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplaceWorkingHoursDto,
  ) {
    return this.workingHoursService.replaceForSalon(user.salonId, dto);
  }
}
