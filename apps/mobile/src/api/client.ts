import { apiConfig } from '../config/api';

export type AuthUser = {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN';
  salonId: string;
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
