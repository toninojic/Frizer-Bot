import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SalonsService } from './salons.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  async findAll(@CurrentSalonId() salonId: string) {
    return [await this.salonsService.findOne(salonId)];
  }

  @Get(':id')
  findOne(@CurrentSalonId() salonId: string, @Param('id') id: string) {
    if (id !== salonId) {
      throw new NotFoundException('Salon not found');
    }

    return this.salonsService.findOne(id);
  }
}
