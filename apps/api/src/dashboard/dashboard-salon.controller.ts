import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardSalonService } from './dashboard-salon.service';
import { UpdateDashboardSalonDto } from './dto/update-dashboard-salon.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardSalonController {
  constructor(private readonly dashboardSalonService: DashboardSalonService) {}

  @Get('salon')
  findSalon(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardSalonService.findSalon(user.salonId);
  }

  @Patch('salon')
  updateSalon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDashboardSalonDto,
  ) {
    return this.dashboardSalonService.updateSalon(user.salonId, dto);
  }

  @Get('salon-settings')
  findSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardSalonService.findSettings(user.salonId);
  }

  @Get('today')
  findToday(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardSalonService.findToday(user.salonId);
  }

  @Get('calls/recent')
  findRecentCalls(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardSalonService.findRecentCalls(user.salonId);
  }

  @Patch('salon-settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSalonSettingsDto,
  ) {
    return this.dashboardSalonService.updateSettings(user.salonId, dto);
  }
}
