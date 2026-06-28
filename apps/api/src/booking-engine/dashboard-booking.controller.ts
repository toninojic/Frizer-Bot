import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FeatureKey, UserRole } from '@prisma/client';
import { CurrentSalonId } from '../auth/decorators/current-salon-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { BookingEngineService } from './booking-engine.service';
import { AvailableSlotsDto } from './dto/available-slots.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Roles(UserRole.SALON_OWNER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard/booking')
export class DashboardBookingController {
  constructor(
    private readonly bookingEngineService: BookingEngineService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  @Get('available-slots')
  async findAvailableSlots(
    @CurrentSalonId() salonId: string,
    @Query() dto: AvailableSlotsDto,
  ) {
    await this.featureFlagsService.requireFeature(
      salonId,
      FeatureKey.MANUAL_BOOKING,
    );

    return this.bookingEngineService.findAvailableSlots(salonId, dto);
  }

  @Post('book')
  async book(
    @CurrentSalonId() salonId: string,
    @Body() dto: BookAppointmentDto,
  ) {
    await this.featureFlagsService.requireFeature(
      salonId,
      FeatureKey.MANUAL_BOOKING,
    );

    return this.bookingEngineService.createBooking({
      ...dto,
      salonId,
    });
  }

  @Post('cancel')
  async cancel(
    @CurrentSalonId() salonId: string,
    @Body() dto: CancelBookingDto,
  ) {
    await this.featureFlagsService.requireFeature(
      salonId,
      FeatureKey.MANUAL_BOOKING,
    );

    return this.bookingEngineService.cancelBooking({
      ...dto,
      salonId,
    });
  }

  @Post('reschedule')
  async reschedule(
    @CurrentSalonId() salonId: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    await this.featureFlagsService.requireFeature(
      salonId,
      FeatureKey.MANUAL_BOOKING,
    );

    return this.bookingEngineService.rescheduleBooking({
      ...dto,
      salonId,
    });
  }
}
