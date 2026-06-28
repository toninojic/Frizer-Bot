import { apiConfig } from '../config/api';

export type AuthUser = {
  id: string;
  email: string;
  role: 'PLATFORM_ADMIN' | 'SALON_OWNER';
  salonId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type SalonSettings = {
  id: string;
  name: string;
  phone: string;
  timezone: string;
  receptionistName: string | null;
  receptionistEnabled: boolean;
  welcomeMessage: string | null;
  transferPhone: string | null;
  workingAfterHoursEnabled: boolean;
  smsConfirmationsEnabled: boolean;
  reminderHoursBefore: number;
};

export type Worker = {
  id: string;
  name: string;
  isActive: boolean;
};

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceAmount: number | null;
  isActive: boolean;
};

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type WorkingHour = {
  id?: string;
  dayOfWeek: DayOfWeek;
  opensAt: string | null;
  closesAt: string | null;
  isClosed: boolean;
};

export type TimeBlock = {
  id: string;
  title: string;
  workerId: string | null;
  workerName: string | null;
  startAt: string;
  endAt: string;
};

export type Customer = {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED';

export type BookingChannel = 'MANUAL' | 'PHONE' | 'WHATSAPP' | 'INSTAGRAM';

export type FeatureKey =
  | 'MANUAL_BOOKING'
  | 'AI_RECEPTIONIST'
  | 'VOICE'
  | 'SMS'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'REMINDERS'
  | 'CALL_RECORDING'
  | 'CALL_TRANSCRIPTS'
  | 'ANALYTICS';

export const FEATURE_KEYS: FeatureKey[] = [
  'MANUAL_BOOKING',
  'AI_RECEPTIONIST',
  'VOICE',
  'SMS',
  'WHATSAPP',
  'INSTAGRAM',
  'REMINDERS',
  'CALL_RECORDING',
  'CALL_TRANSCRIPTS',
  'ANALYTICS',
];

export type SalonFeature = {
  featureKey: FeatureKey;
  enabled: boolean;
};

export type Appointment = {
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
  status: AppointmentStatus;
  channel: BookingChannel;
  notes: string | null;
};

export type AvailableSlot = {
  workerId: string;
  workerName: string;
  startAt: string;
  endAt: string;
  label: string;
};

export type TodaySummary = {
  date: string;
  nextAppointment: Appointment | null;
  stats: {
    booked: number;
    completed: number;
    cancelled: number;
  };
  appointments: Appointment[];
};

export type RecentCall = {
  id: string;
  customerPhone: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  outcome: string;
};

export type PlatformOverview = {
  totalSalons: number;
  activeSalons: number;
  totalAppointmentsToday: number;
  totalCallsToday: number;
  totalSmsThisMonth: number;
};

export type PlatformSalonSummary = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  isActive: boolean;
  receptionistEnabled: boolean;
  workersCount: number;
  servicesCount: number;
  appointmentsToday: number;
  callsToday: number;
  createdAt: string;
};

export type PlatformSalonDetails = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  timezone: string;
  isActive: boolean;
  receptionistName: string | null;
  receptionistEnabled: boolean;
  transferPhone: string | null;
  workingAfterHoursEnabled: boolean;
  smsConfirmationsEnabled: boolean;
  reminderHoursBefore: number;
  createdAt: string;
  workers: Worker[];
  services: Service[];
  workingHours: WorkingHour[];
  usage: {
    appointmentsToday: number;
    appointmentsThisMonth: number;
    callsToday: number;
    callsThisMonth: number;
    smsThisMonth: number;
  };
};

export type CreatePlatformSalonInput = {
  name: string;
  phone: string;
  city?: string;
  ownerEmail: string;
  ownerPassword: string;
  timezone: string;
};

export type UpdatePlatformSalonInput = Partial<
  Pick<
    PlatformSalonDetails,
    | 'name'
    | 'phone'
    | 'city'
    | 'timezone'
    | 'isActive'
    | 'receptionistName'
    | 'receptionistEnabled'
    | 'transferPhone'
    | 'workingAfterHoursEnabled'
    | 'smsConfirmationsEnabled'
    | 'reminderHoursBefore'
  >
>;

type ApiClientOptions = {
  getAccessToken: () => string | null;
  onUnauthorized: () => void | Promise<void>;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

export function createApiClient(options: ApiClientOptions) {
  async function request<T>(path: string, requestOptions: RequestOptions = {}) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (requestOptions.body) {
      headers['Content-Type'] = 'application/json';
    }

    if (requestOptions.auth !== false) {
      const token = options.getAccessToken();

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      method: requestOptions.method ?? 'GET',
      headers,
      body: requestOptions.body
        ? JSON.stringify(requestOptions.body)
        : undefined,
    });

    if (response.status === 401) {
      await options.onUnauthorized();
      throw new Error('Session expired');
    }

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      const message =
        data?.code ??
        data?.message ??
        data?.error ??
        `Request failed with status ${response.status}`;
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    return data as T;
  }

  return {
    login(email: string, password: string) {
      return request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
    },
    me() {
      return request<AuthUser>('/auth/me');
    },
    salonSettings() {
      return request<SalonSettings>('/dashboard/salon-settings');
    },
    updateSalonSettings(body: Partial<SalonSettings>) {
      return request<SalonSettings>('/dashboard/salon-settings', {
        method: 'PATCH',
        body,
      });
    },
    today() {
      return request<TodaySummary>('/dashboard/today');
    },
    recentCalls() {
      return request<RecentCall[]>('/dashboard/calls/recent');
    },
    dashboardFeatures() {
      return request<SalonFeature[]>('/dashboard/features');
    },
    adminOverview() {
      return request<PlatformOverview>('/admin/overview');
    },
    adminSalons() {
      return request<PlatformSalonSummary[]>('/admin/salons');
    },
    adminSalon(id: string) {
      return request<PlatformSalonDetails>(`/admin/salons/${id}`);
    },
    createAdminSalon(body: CreatePlatformSalonInput) {
      return request<PlatformSalonDetails>('/admin/salons', {
        method: 'POST',
        body,
      });
    },
    updateAdminSalon(id: string, body: UpdatePlatformSalonInput) {
      return request<PlatformSalonDetails>(`/admin/salons/${id}`, {
        method: 'PATCH',
        body,
      });
    },
    adminSalonFeatures(id: string) {
      return request<SalonFeature[]>(`/admin/salons/${id}/features`);
    },
    updateAdminSalonFeature(
      id: string,
      featureKey: FeatureKey,
      enabled: boolean,
    ) {
      return request<SalonFeature>(`/admin/salons/${id}/features/${featureKey}`, {
        method: 'PATCH',
        body: { enabled },
      });
    },
    workers() {
      return request<Worker[]>('/dashboard/workers');
    },
    createWorker(body: { name: string; isActive?: boolean }) {
      return request<Worker>('/dashboard/workers', {
        method: 'POST',
        body,
      });
    },
    updateWorker(
      id: string,
      body: Partial<Pick<Worker, 'name' | 'isActive'>>,
    ) {
      return request<Worker>(`/dashboard/workers/${id}`, {
        method: 'PATCH',
        body,
      });
    },
    deactivateWorker(id: string) {
      return request<Worker>(`/dashboard/workers/${id}`, {
        method: 'DELETE',
      });
    },
    services() {
      return request<Service[]>('/dashboard/services');
    },
    createService(body: {
      name: string;
      durationMinutes: number;
      priceAmount?: number | null;
      isActive?: boolean;
    }) {
      return request<Service>('/dashboard/services', {
        method: 'POST',
        body,
      });
    },
    updateService(
      id: string,
      body: Partial<
        Pick<Service, 'name' | 'durationMinutes' | 'priceAmount' | 'isActive'>
      >,
    ) {
      return request<Service>(`/dashboard/services/${id}`, {
        method: 'PATCH',
        body,
      });
    },
    deactivateService(id: string) {
      return request<Service>(`/dashboard/services/${id}`, {
        method: 'DELETE',
      });
    },
    workingHours() {
      return request<WorkingHour[]>('/dashboard/working-hours');
    },
    replaceWorkingHours(hours: WorkingHour[]) {
      return request<WorkingHour[]>('/dashboard/working-hours', {
        method: 'PUT',
        body: {
          hours: hours.map(({ dayOfWeek, opensAt, closesAt, isClosed }) => ({
            dayOfWeek,
            opensAt,
            closesAt,
            isClosed,
          })),
        },
      });
    },
    timeBlocks() {
      return request<TimeBlock[]>('/dashboard/time-blocks');
    },
    createTimeBlock(body: {
      title: string;
      workerId?: string | null;
      startAt: string;
      endAt: string;
    }) {
      return request<TimeBlock>('/dashboard/time-blocks', {
        method: 'POST',
        body,
      });
    },
    deleteTimeBlock(id: string) {
      return request<{ id: string }>(`/dashboard/time-blocks/${id}`, {
        method: 'DELETE',
      });
    },
    customers(filters: { search?: string } = {}) {
      return request<Customer[]>(`/dashboard/customers${queryString(filters)}`);
    },
    customer(id: string) {
      return request<Customer>(`/dashboard/customers/${id}`);
    },
    appointments(filters: { date?: string; from?: string; to?: string } = {}) {
      return request<Appointment[]>(
        `/dashboard/appointments${queryString(filters)}`,
      );
    },
    appointment(id: string) {
      return request<Appointment>(`/dashboard/appointments/${id}`);
    },
    availableSlots(filters: {
      serviceId: string;
      workerId?: string;
      date: string;
      preferredTimeFrom?: string;
      preferredTimeTo?: string;
      limit?: number;
    }) {
      return request<{ slots: AvailableSlot[] }>(
        `/dashboard/booking/available-slots${queryString(filters)}`,
      );
    },
    bookAppointment(body: {
      workerId: string;
      serviceId: string;
      customerName: string;
      customerPhone: string;
      startAt: string;
      channel?: BookingChannel;
    }) {
      return request<Appointment>('/dashboard/booking/book', {
        method: 'POST',
        body,
      });
    },
    cancelBooking(body: { appointmentId: string; reason?: string }) {
      return request<Appointment>('/dashboard/booking/cancel', {
        method: 'POST',
        body,
      });
    },
    rescheduleBooking(body: {
      appointmentId: string;
      newStartAt: string;
      workerId?: string;
    }) {
      return request<Appointment>('/dashboard/booking/reschedule', {
        method: 'POST',
        body,
      });
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

function queryString(params: Record<string, string | number | undefined>) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== '',
  );

  if (entries.length === 0) {
    return '';
  }

  return `?${entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&')}`;
}
