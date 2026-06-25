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
  };
}
