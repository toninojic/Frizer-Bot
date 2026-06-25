import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SalonsModule } from './salons/salons.module';
import { SalonServicesModule } from './services/services.module';
import { TimeBlocksModule } from './time-blocks/time-blocks.module';
import { WorkersModule } from './workers/workers.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    SalonsModule,
    WorkersModule,
    SalonServicesModule,
    WorkingHoursModule,
    TimeBlocksModule,
    CustomersModule,
    AppointmentsModule,
  ],
})
export class AppModule {}
