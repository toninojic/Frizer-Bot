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
