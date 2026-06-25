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
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SalonServicesService } from './services.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/services')
export class ServicesController {
  constructor(private readonly salonServicesService: SalonServicesService) {}

  @Get()
  findAllForSalon(@CurrentUser() user: AuthenticatedUser) {
    return this.salonServicesService.findAllForSalon(user.salonId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    return this.salonServicesService.create(user.salonId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.salonServicesService.update(user.salonId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.salonServicesService.remove(user.salonId, id);
  }
}
