import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkersService } from './workers.service';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  findAllForSalon(@CurrentSalonId() salonId: string) {
    return this.workersService.findAllForSalon(salonId);
  }

  @Post()
  create(@CurrentSalonId() salonId: string, @Body() dto: CreateWorkerDto) {
    return this.workersService.create(salonId, dto);
  }

  @Patch(':id')
  update(
    @CurrentSalonId() salonId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDto,
  ) {
    return this.workersService.update(salonId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentSalonId() salonId: string, @Param('id') id: string) {
    return this.workersService.remove(salonId, id);
  }
}
