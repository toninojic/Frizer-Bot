import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingEngineService } from './booking-engine.service';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard/booking')
export class DashboardBookingController {
  constructor(private readonly bookingEngineService: BookingEngineService) {}

  @Get('available-slots')
  findAvailableSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: AvailableSlotsDto,
  ) {
    return this.bookingEngineService.findAvailableSlots(user.salonId, dto);
  }

  @Post('book')
  book(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.bookingEngineService.createBooking({
      ...dto,
      salonId: user.salonId,
    });
  }

  @Post('cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingEngineService.cancelBooking({
      ...dto,
      salonId: user.salonId,
    });
  }

  @Post('reschedule')
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingEngineService.rescheduleBooking({
      ...dto,
      salonId: user.salonId,
    });
  }
}
