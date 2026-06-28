import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAllForSalon(
    @CurrentSalonId() salonId: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAllForSalon(salonId, search);
  }

  @Get(':id')
  findOneForSalon(
    @CurrentSalonId() salonId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOneForSalon(salonId, id);
  }

  @Post()
  create(@CurrentSalonId() salonId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(salonId, dto);
  }

  @Patch(':id')
  update(
    @CurrentSalonId() salonId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(salonId, id, dto);
  }
}
