import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FeatureKey, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { UpdateFeatureDto } from '../feature-flags/dto/update-feature.dto';
import { AdminService } from './admin.service';
import { CreateAdminSalonDto } from './dto/create-admin-salon.dto';
import { UpdateAdminSalonDto } from './dto/update-admin-salon.dto';

@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('salons')
  findSalons() {
    return this.adminService.findSalons();
  }

  @Post('salons')
  createSalon(@Body() dto: CreateAdminSalonDto) {
    return this.adminService.createSalon(dto);
  }

  @Get('salons/:id')
  findSalon(@Param('id') id: string) {
    return this.adminService.findSalon(id);
  }

  @Patch('salons/:id')
  updateSalon(@Param('id') id: string, @Body() dto: UpdateAdminSalonDto) {
    return this.adminService.updateSalon(id, dto);
  }

  @Get('salons/:id/features')
  findSalonFeatures(@Param('id') id: string) {
    return this.featureFlagsService.getSalonFeatures(id);
  }

  @Patch('salons/:id/features/:featureKey')
  updateSalonFeature(
    @Param('id') id: string,
    @Param('featureKey', new ParseEnumPipe(FeatureKey)) featureKey: FeatureKey,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featureFlagsService.setFeature(id, featureKey, dto.enabled);
  }
}
