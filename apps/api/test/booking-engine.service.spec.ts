import test from 'node:test';
import assert from 'node:assert/strict';
import { AppointmentStatus, BookingChannel, DayOfWeek } from '@prisma/client';
import { DateTime } from 'luxon';
import { BookingEngineService } from '../src/booking-engine/booking-engine.service';

const timezone = 'Europe/Belgrade';

type Appointment = {
  id: string;
  salonId: string;
  workerId: string;
  customerId: string;
  serviceId: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  serviceNameSnapshot: string;
  workerNameSnapshot: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  channel: BookingChannel;
  notes: string | null;
};

class FakePrisma {
  salons = [
    {
      id: 'salon-1',
      name: 'Salon Test',
      timezone,
      isActive: true,
    },
  ];
  workers = [
    {
      id: 'worker-1',
      salonId: 'salon-1',
      name: 'Ana',
      isActive: true,
    },
  ];
  services = [
    {
      id: 'service-1',
      salonId: 'salon-1',
      name: 'Sisanje',
      durationMinutes: 30,
      isActive: true,
    },
  ];
  workingHours = [
    {
      salonId: 'salon-1',
      dayOfWeek: DayOfWeek.MONDAY,
      opensAt: '09:00',
      closesAt: '18:00',
      isClosed: false,
    },
    {
      salonId: 'salon-1',
      dayOfWeek: DayOfWeek.SUNDAY,
      opensAt: null,
      closesAt: null,
      isClosed: true,
    },
  ];
  appointments: Appointment[] = [];
  timeBlocks: Array<{
    id: string;
    salonId: string;
    workerId: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
  }> = [];
  customers: Array<{
    id: string;
    salonId: string;
    name: string;
    phone: string;
  }> = [];

  salon = {
    findFirst: async ({ where }: any) =>
      this.salons.find(
        (salon) =>
          salon.id === where.id &&
          (where.isActive === undefined || salon.isActive === where.isActive),
      ) ?? null,
  };

  worker = {
    findFirst: async ({ where }: any) =>
      this.workers.find(
        (worker) =>
          worker.id === where.id &&
          worker.salonId === where.salonId &&
          (where.isActive === undefined || worker.isActive === where.isActive),
      ) ?? null,
    findMany: async ({ where }: any) =>
      this.workers
        .filter(
          (worker) =>
            worker.salonId === where.salonId &&
            (where.isActive === undefined || worker.isActive === where.isActive),
        )
        .sort((first, second) => first.name.localeCompare(second.name)),
  };

  service = {
    findFirst: async ({ where }: any) =>
      this.services.find(
        (service) =>
          service.id === where.id &&
          service.salonId === where.salonId &&
          (where.isActive === undefined || service.isActive === where.isActive),
      ) ?? null,
  };

  workingHour = {
    findFirst: async ({ where }: any) =>
      this.workingHours.find(
        (workingHour) =>
          workingHour.salonId === where.salonId &&
          workingHour.dayOfWeek === where.dayOfWeek,
      ) ?? null,
  };

  appointment = {
    findMany: async ({ where }: any) =>
      this.appointments.filter((appointment) =>
        matchesAppointmentWhere(appointment, where),
      ),
    count: async ({ where }: any) =>
      this.appointments.filter((appointment) =>
        matchesAppointmentWhere(appointment, where),
      ).length,
    findFirst: async ({ where }: any) =>
      this.appointments.find((appointment) =>
        matchesAppointmentWhere(appointment, where),
      ) ?? null,
    create: async ({ data }: any) => {
      const appointment = {
        id: `appointment-${this.appointments.length + 1}`,
        notes: null,
        ...data,
      } as Appointment;
      this.appointments.push(appointment);
      return appointment;
    },
    update: async ({ where, data }: any) => {
      const appointment = this.appointments.find((item) => item.id === where.id);
      assert(appointment);
      Object.assign(appointment, data);
      return appointment;
    },
  };

  workerTimeBlock = {
    findMany: async ({ where }: any) =>
      this.timeBlocks.filter(
        (timeBlock) =>
          timeBlock.salonId === where.salonId &&
          (timeBlock.workerId === null || timeBlock.workerId === where.OR[1].workerId) &&
          timeBlock.startAt < where.startAt.lt &&
          timeBlock.endAt > where.endAt.gt,
      ),
  };

  customer = {
    upsert: async ({ where, update, create }: any) => {
      const existing = this.customers.find(
        (customer) =>
          customer.salonId === where.salonId_phone.salonId &&
          customer.phone === where.salonId_phone.phone,
      );

      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const customer = {
        id: `customer-${this.customers.length + 1}`,
        ...create,
      };
      this.customers.push(customer);
      return customer;
    },
  };

  $transaction(operation: (tx: FakePrisma) => Promise<unknown>) {
    return operation(this);
  }
}

test('finds slot during working hours', async () => {
  const engine = engineWith();
  const result = await engine.findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(result.slots[0].workerId, 'worker-1');
  assert.equal(localTime(result.slots[0].startAt), '09:00');
});

test('does not find slot on closed day', async () => {
  const engine = engineWith();
  const result = await engine.findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-06',
    limit: 1,
  });

  assert.deepEqual(result.slots, []);
});

test('does not return past slots', async () => {
  const engine = engineWith();
  const result = await engine.findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2020-01-06',
    limit: 1,
  });

  assert.deepEqual(result.slots, []);
});

test('blocks existing booked appointment', async () => {
  const prisma = fakePrisma();
  prisma.appointments.push(appointment('booked-1', '09:00', '09:30'));
  const result = await engineWith(prisma).findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(localTime(result.slots[0].startAt), '09:30');
});

test('ignores cancelled appointment', async () => {
  const prisma = fakePrisma();
  prisma.appointments.push(
    appointment('cancelled-1', '09:00', '09:30', AppointmentStatus.CANCELLED),
  );
  const result = await engineWith(prisma).findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(localTime(result.slots[0].startAt), '09:00');
});

test('blocks worker time block', async () => {
  const prisma = fakePrisma();
  prisma.timeBlocks.push(timeBlock('block-1', 'worker-1', '09:00', '10:00'));
  const result = await engineWith(prisma).findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(localTime(result.slots[0].startAt), '10:00');
});

test('blocks whole salon time block', async () => {
  const prisma = fakePrisma();
  prisma.timeBlocks.push(timeBlock('block-1', null, '09:00', '10:00'));
  const result = await engineWith(prisma).findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(localTime(result.slots[0].startAt), '10:00');
});

test('rejects double booking', async () => {
  const prisma = fakePrisma();
  prisma.appointments.push(appointment('booked-1', '10:00', '10:30'));

  await assert.rejects(
    () =>
      engineWith(prisma).createBooking({
        salonId: 'salon-1',
        workerId: 'worker-1',
        serviceId: 'service-1',
        customerName: 'Marko',
        customerPhone: '+381641234567',
        startAt: isoAt('10:00'),
        channel: BookingChannel.MANUAL,
      }),
    /SLOT_CONFLICT/,
  );
});

test('reschedules safely', async () => {
  const prisma = fakePrisma();
  prisma.appointments.push(appointment('booked-1', '10:00', '10:30'));
  const result = await engineWith(prisma).rescheduleBooking({
    salonId: 'salon-1',
    appointmentId: 'booked-1',
    newStartAt: isoAt('10:30'),
  });

  assert.equal(result.id, 'booked-1');
  assert.equal(localTime(result.startAt), '10:30');
});

test('supports any worker slot search', async () => {
  const prisma = fakePrisma();
  prisma.workers.push({
    id: 'worker-2',
    salonId: 'salon-1',
    name: 'Bora',
    isActive: true,
  });
  prisma.timeBlocks.push(timeBlock('block-1', 'worker-1', '09:00', '10:00'));

  const result = await engineWith(prisma).findAvailableSlots('salon-1', {
    serviceId: 'service-1',
    date: '2030-01-07',
    limit: 1,
  });

  assert.equal(result.slots[0].workerId, 'worker-2');
  assert.equal(localTime(result.slots[0].startAt), '09:00');
});

function fakePrisma() {
  return new FakePrisma();
}

function engineWith(prisma = fakePrisma()) {
  return new BookingEngineService(prisma as any);
}

function appointment(
  id: string,
  startTime: string,
  endTime: string,
  status: AppointmentStatus = AppointmentStatus.BOOKED,
): Appointment {
  return {
    id,
    salonId: 'salon-1',
    workerId: 'worker-1',
    customerId: 'customer-1',
    serviceId: 'service-1',
    customerNameSnapshot: 'Marko',
    customerPhoneSnapshot: '+381641234567',
    serviceNameSnapshot: 'Sisanje',
    workerNameSnapshot: 'Ana',
    startAt: dateAt(startTime),
    endAt: dateAt(endTime),
    status,
    channel: BookingChannel.MANUAL,
    notes: null,
  };
}

function timeBlock(
  id: string,
  workerId: string | null,
  startTime: string,
  endTime: string,
) {
  return {
    id,
    salonId: 'salon-1',
    workerId,
    title: 'Block',
    startAt: dateAt(startTime),
    endAt: dateAt(endTime),
  };
}

function matchesAppointmentWhere(appointment: Appointment, where: any) {
  return (
    (!where.id ||
      appointment.id === where.id ||
      (where.id.not && appointment.id !== where.id.not)) &&
    (!where.salonId || appointment.salonId === where.salonId) &&
    (!where.workerId || appointment.workerId === where.workerId) &&
    (!where.status || appointment.status === where.status) &&
    (!where.startAt?.lt || appointment.startAt < where.startAt.lt) &&
    (!where.startAt?.gte || appointment.startAt >= where.startAt.gte) &&
    (!where.endAt?.gt || appointment.endAt > where.endAt.gt) &&
    (!where.endAt?.lte || appointment.endAt <= where.endAt.lte)
  );
}

function dateAt(time: string) {
  return DateTime.fromISO(`2030-01-07T${time}`, { zone: timezone }).toJSDate();
}

function isoAt(time: string) {
  return DateTime.fromISO(`2030-01-07T${time}`, {
    zone: timezone,
  }).toUTC().toISO()!;
}

function localTime(value: string) {
  return DateTime.fromISO(value, { zone: 'utc' })
    .setZone(timezone)
    .toFormat('HH:mm');
}
