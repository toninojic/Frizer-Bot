import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagsService } from './feature-flags.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/features')
export class DashboardFeaturesController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  findFeatures(@CurrentSalonId() salonId: string) {
    return this.featureFlagsService.getSalonFeatures(salonId);
  }
}
