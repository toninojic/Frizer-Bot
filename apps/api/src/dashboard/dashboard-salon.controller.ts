import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardSalonService } from './dashboard-salon.service';
import { UpdateDashboardSalonDto } from './dto/update-dashboard-salon.dto';
import { UpdateSalonSettingsDto } from './dto/update-salon-settings.dto';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardSalonController {
  constructor(private readonly dashboardSalonService: DashboardSalonService) {}

  @Get('salon')
  findSalon(@CurrentSalonId() salonId: string) {
    return this.dashboardSalonService.findSalon(salonId);
  }

  @Patch('salon')
  updateSalon(
    @CurrentSalonId() salonId: string,
    @Body() dto: UpdateDashboardSalonDto,
  ) {
    return this.dashboardSalonService.updateSalon(salonId, dto);
  }

  @Get('salon-settings')
  findSettings(@CurrentSalonId() salonId: string) {
    return this.dashboardSalonService.findSettings(salonId);
  }

  @Get('today')
  findToday(@CurrentSalonId() salonId: string) {
    return this.dashboardSalonService.findToday(salonId);
  }

  @Get('calls/recent')
  findRecentCalls(@CurrentSalonId() salonId: string) {
    return this.dashboardSalonService.findRecentCalls(salonId);
  }

  @Patch('salon-settings')
  updateSettings(
    @CurrentSalonId() salonId: string,
    @Body() dto: UpdateSalonSettingsDto,
  ) {
    return this.dashboardSalonService.updateSettings(salonId, dto);
  }
}
