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
import { BookingEngineService } from '../booking-engine/booking-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly bookingEngineService: BookingEngineService,
  ) {}

  @Get()
  findAllForSalon(
    @CurrentSalonId() salonId: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findAllForSalon(salonId, {
      date,
      from,
      to,
    });
  }

  @Get(':id')
  findOneForSalon(
    @CurrentSalonId() salonId: string,
    @Param('id') id: string,
  ) {
    return this.appointmentsService.findOneForSalon(salonId, id);
  }

  @Post()
  create(@CurrentSalonId() salonId: string, @Body() dto: CreateAppointmentDto) {
    return this.bookingEngineService.createBooking({
      ...dto,
      salonId,
    });
  }

  @Patch(':id/cancel')
  cancel(@CurrentSalonId() salonId: string, @Param('id') id: string) {
    return this.bookingEngineService.cancelBooking({
      salonId,
      appointmentId: id,
    });
  }
}
