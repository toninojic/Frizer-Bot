import { DayOfWeek, FeatureKey, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const salonPhone = '+381641112223';

const salonAnaFeatures: Record<FeatureKey, boolean> = {
  [FeatureKey.MANUAL_BOOKING]: true,
  [FeatureKey.AI_RECEPTIONIST]: true,
  [FeatureKey.VOICE]: true,
  [FeatureKey.SMS]: true,
  [FeatureKey.WHATSAPP]: false,
  [FeatureKey.INSTAGRAM]: false,
  [FeatureKey.REMINDERS]: false,
  [FeatureKey.CALL_RECORDING]: true,
  [FeatureKey.CALL_TRANSCRIPTS]: true,
  [FeatureKey.ANALYTICS]: false,
};

async function upsertDemoSalon() {
  const existingSalon = await prisma.salon.findFirst({
    where: { phone: salonPhone },
  });

  if (existingSalon) {
    return prisma.salon.update({
      where: { id: existingSalon.id },
      data: {
        name: 'Salon Ana',
        phone: salonPhone,
        twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
        city: 'Nis',
        timezone: 'Europe/Belgrade',
        isActive: true,
        receptionistName: 'Mila',
        receptionistEnabled: true,
        welcomeMessage: 'Dobar dan, Salon Ana. Kako mogu da vam pomognem?',
        transferPhone: salonPhone,
        workingAfterHoursEnabled: false,
        smsConfirmationsEnabled: true,
        reminderHoursBefore: 2,
      },
    });
  }

  return prisma.salon.create({
    data: {
      name: 'Salon Ana',
      phone: salonPhone,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
      city: 'Nis',
      timezone: 'Europe/Belgrade',
      isActive: true,
      receptionistName: 'Mila',
      receptionistEnabled: true,
      welcomeMessage: 'Dobar dan, Salon Ana. Kako mogu da vam pomognem?',
      transferPhone: salonPhone,
      workingAfterHoursEnabled: false,
      smsConfirmationsEnabled: true,
      reminderHoursBefore: 2,
    },
  });
}

async function upsertWorker(salonId: string, name: string) {
  const existingWorker = await prisma.worker.findFirst({
    where: { salonId, name },
  });

  if (existingWorker) {
    return prisma.worker.update({
      where: { id: existingWorker.id },
      data: { isActive: true },
    });
  }

  return prisma.worker.create({
    data: { salonId, name, isActive: true },
  });
}

async function upsertService(
  salonId: string,
  name: string,
  durationMinutes: number,
) {
  const existingService = await prisma.service.findFirst({
    where: { salonId, name },
  });

  if (existingService) {
    return prisma.service.update({
      where: { id: existingService.id },
      data: { durationMinutes, priceAmount: null, isActive: true },
    });
  }

  return prisma.service.create({
    data: {
      salonId,
      name,
      durationMinutes,
      priceAmount: null,
      isActive: true,
    },
  });
}

async function upsertSalonFeature(
  salonId: string,
  featureKey: FeatureKey,
  enabled: boolean,
) {
  return prisma.salonFeature.upsert({
    where: {
      salonId_featureKey: {
        salonId,
        featureKey,
      },
    },
    update: { enabled },
    create: {
      salonId,
      featureKey,
      enabled,
    },
  });
}

async function main() {
  const salon = await upsertDemoSalon();
  const ownerPasswordHash = await bcrypt.hash('password123', 12);
  const platformAdminPasswordHash = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@platform.local' },
    update: {
      passwordHash: platformAdminPasswordHash,
      role: UserRole.PLATFORM_ADMIN,
      salonId: null,
    },
    create: {
      email: 'admin@platform.local',
      passwordHash: platformAdminPasswordHash,
      role: UserRole.PLATFORM_ADMIN,
      salonId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@salonana.local' },
    update: {
      salonId: salon.id,
      passwordHash: ownerPasswordHash,
      role: UserRole.SALON_OWNER,
    },
    create: {
      salonId: salon.id,
      email: 'owner@salonana.local',
      passwordHash: ownerPasswordHash,
      role: UserRole.SALON_OWNER,
    },
  });

  await Promise.all([
    upsertWorker(salon.id, 'Ana'),
    upsertWorker(salon.id, 'Marija'),
    upsertService(salon.id, 'Šišanje', 30),
    upsertService(salon.id, 'Feniranje', 20),
    upsertService(salon.id, 'Šišanje i pranje', 45),
    upsertService(salon.id, 'Farbanje', 120),
  ]);

  await Promise.all(
    Object.entries(salonAnaFeatures).map(([featureKey, enabled]) =>
      upsertSalonFeature(salon.id, featureKey as FeatureKey, enabled),
    ),
  );

  const workingHours = [
    { dayOfWeek: DayOfWeek.MONDAY, opensAt: '09:00', closesAt: '18:00' },
    { dayOfWeek: DayOfWeek.TUESDAY, opensAt: '09:00', closesAt: '18:00' },
    { dayOfWeek: DayOfWeek.WEDNESDAY, opensAt: '09:00', closesAt: '18:00' },
    { dayOfWeek: DayOfWeek.THURSDAY, opensAt: '09:00', closesAt: '18:00' },
    { dayOfWeek: DayOfWeek.FRIDAY, opensAt: '09:00', closesAt: '18:00' },
    { dayOfWeek: DayOfWeek.SATURDAY, opensAt: '09:00', closesAt: '14:00' },
    { dayOfWeek: DayOfWeek.SUNDAY, opensAt: null, closesAt: null },
  ];

  await Promise.all(
    workingHours.map((workingHour) =>
      prisma.workingHour.upsert({
        where: {
          salonId_dayOfWeek: {
            salonId: salon.id,
            dayOfWeek: workingHour.dayOfWeek,
          },
        },
        update: {
          opensAt: workingHour.opensAt,
          closesAt: workingHour.closesAt,
          isClosed: workingHour.dayOfWeek === DayOfWeek.SUNDAY,
        },
        create: {
          salonId: salon.id,
          dayOfWeek: workingHour.dayOfWeek,
          opensAt: workingHour.opensAt,
          closesAt: workingHour.closesAt,
          isClosed: workingHour.dayOfWeek === DayOfWeek.SUNDAY,
        },
      }),
    ),
  );

  console.log(`Seeded demo salon: ${salon.name} (${salon.id})`);
  console.log('Seeded platform admin: admin@platform.local');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
