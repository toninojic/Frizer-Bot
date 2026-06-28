import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SalonServicesService } from './services.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/services')
export class ServicesController {
  constructor(private readonly salonServicesService: SalonServicesService) {}

  @Get()
  findAllForSalon(@CurrentSalonId() salonId: string) {
    return this.salonServicesService.findAllForSalon(salonId);
  }

  @Post()
  create(@CurrentSalonId() salonId: string, @Body() dto: CreateServiceDto) {
    return this.salonServicesService.create(salonId, dto);
  }

  @Patch(':id')
  update(
    @CurrentSalonId() salonId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.salonServicesService.update(salonId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentSalonId() salonId: string, @Param('id') id: string) {
    return this.salonServicesService.remove(salonId, id);
  }
}
