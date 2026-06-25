import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalonsService } from './salons.service';

@UseGuards(JwtAuthGuard)
@Controller('salons')
export class SalonsController {
  constructor(private readonly salonsService: SalonsService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return [await this.salonsService.findOne(user.salonId)];
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    if (id !== user.salonId) {
      throw new NotFoundException('Salon not found');
    }

    return this.salonsService.findOne(id);
  }
}
