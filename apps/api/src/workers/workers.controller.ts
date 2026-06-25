import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkersService } from './workers.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  findAllForSalon(@CurrentUser() user: AuthenticatedUser) {
    return this.workersService.findAllForSalon(user.salonId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkerDto) {
    return this.workersService.create(user.salonId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDto,
  ) {
    return this.workersService.update(user.salonId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.workersService.remove(user.salonId, id);
  }
}
