import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReplaceWorkingHoursDto } from './dto/replace-working-hours.dto';
import { WorkingHoursService } from './working-hours.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Get()
  findAllForSalon(@CurrentSalonId() salonId: string) {
    return this.workingHoursService.findAllForSalon(salonId);
  }

  @Put()
  replaceForSalon(
    @CurrentSalonId() salonId: string,
    @Body() dto: ReplaceWorkingHoursDto,
  ) {
    return this.workingHoursService.replaceForSalon(salonId, dto);
  }
}
