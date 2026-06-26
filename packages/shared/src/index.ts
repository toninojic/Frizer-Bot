export type BookingChannel = 'phone' | 'whatsapp' | 'instagram' | 'manual';

export type ApiHealthResponse = {
  status: 'ok';
  service: 'ai-salon-receptionist-api';
};

export type DashboardWorker = {
  id: string;
  name: string;
  isActive: boolean;
};

export type DashboardService = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number | null;
  isActive: boolean;
};

export type DashboardDayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type DashboardWorkingHour = {
  id?: string;
  dayOfWeek: DashboardDayOfWeek;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export type DashboardTimeBlock = {
  id: string;
  title: string;
  workerId: string | null;
  workerName: string | null;
  startAt: string;
  endAt: string;
};

export type DashboardAppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export type DashboardAppointment = {
  id: string;
  salonId: string;
  workerId: string;
  customerId: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  workerName: string;
  startAt: string;
  endAt: string;
  status: DashboardAppointmentStatus;
  channel: 'MANUAL' | 'PHONE' | 'WHATSAPP' | 'INSTAGRAM';
  notes: string | null;
};

export type BookingAvailableSlot = {
  workerId: string;
  workerName: string;
  startAt: string;
  endAt: string;
  label: string;
};
