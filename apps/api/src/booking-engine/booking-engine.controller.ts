import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { BookingEngineService } from './booking-engine.service';

@Controller('booking')
export class BookingEngineController {
  constructor(private readonly bookingEngineService: BookingEngineService) {}

  @Post('available-slots')
  findAvailableSlots(@Body() dto: AvailableSlotsDto) {
    return this.bookingEngineService.findAvailableSlots(
      this.requireSalonId(dto.salonId),
      dto,
    );
  }

  @Post('book')
  book(@Body() dto: BookAppointmentDto) {
    return this.bookingEngineService.createBooking({
      ...dto,
      salonId: this.requireSalonId(dto.salonId),
    });
  }

  @Post('cancel')
  cancel(@Body() dto: CancelBookingDto) {
    return this.bookingEngineService.cancelBooking({
      ...dto,
      salonId: this.requireSalonId(dto.salonId),
    });
  }

  @Post('reschedule')
  reschedule(@Body() dto: RescheduleBookingDto) {
    return this.bookingEngineService.rescheduleBooking({
      ...dto,
      salonId: this.requireSalonId(dto.salonId),
    });
  }

  private requireSalonId(salonId?: string) {
    if (!salonId) {
      throw new BadRequestException('SALON_ID_REQUIRED');
    }

    return salonId;
  }
}
