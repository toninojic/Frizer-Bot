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
import { AuthenticatedUser } from '../auth/auth.types';
import { BookingEngineService } from '../booking-engine/booking-engine.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly bookingEngineService: BookingEngineService,
  ) {}

  @Get()
  findAllForSalon(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.appointmentsService.findAllForSalon(user.salonId, {
      date,
      from,
      to,
    });
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.bookingEngineService.createBooking({
      ...dto,
      salonId: user.salonId,
    });
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingEngineService.cancelBooking({
      salonId: user.salonId,
      appointmentId: id,
    });
  }
}
