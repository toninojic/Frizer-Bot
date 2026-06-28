import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type {
  AppointmentStatus,
  BookingChannel,
  DayOfWeek,
  FeatureKey,
} from '../api/client';
import { translations, Language, TranslationKey } from './translations';

type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  statusLabel: (status: AppointmentStatus) => string;
  channelLabel: (channel: BookingChannel) => string;
  callOutcomeLabel: (outcome: string) => string;
  dayLabel: (day: DayOfWeek) => string;
  featureLabel: (featureKey: FeatureKey) => string;
  roleLabel: (role: 'PLATFORM_ADMIN' | 'SALON_OWNER') => string;
  formatTime: (value: string | Date) => string;
  formatDate: (value: string | Date) => string;
  formatReadableDate: (date: string) => string;
  mapError: (error: unknown) => string;
};

const languageKey = 'ai-salon-language';
const defaultLanguage: Language = 'sr';
const I18nContext = createContext<I18nContextValue | null>(null);

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

async function getStoredLanguage(): Promise<Language | null> {
  const value = canUseWebStorage()
    ? window.localStorage.getItem(languageKey)
    : await SecureStore.getItemAsync(languageKey);

  return value === 'sr' || value === 'en' ? value : null;
}

async function storeLanguage(language: Language) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(languageKey, language);
    return;
  }

  await SecureStore.setItemAsync(languageKey, language);
}

function interpolate(message: string, params: TranslationParams = {}) {
  return Object.entries(params).reduce(
    (current, [key, value]) =>
      current.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    message,
  );
}

function localeForLanguage(language: Language) {
  return language === 'sr' ? 'sr-RS' : 'en-US';
}

function formatSerbianDate(value: string | Date) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}.${month}.${date.getFullYear()}.`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    async function loadLanguage() {
      const storedLanguage = await getStoredLanguage();

      if (storedLanguage) {
        setLanguageState(storedLanguage);
      }
    }

    loadLanguage();
  }, []);

  const locale = localeForLanguage(language);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      interpolate(translations[language][key] ?? translations.sr[key], params),
    [language],
  );

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    await storeLanguage(nextLanguage);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      locale,
      setLanguage,
      t,
      statusLabel: (status) =>
        t(`status.${status}` as TranslationKey) || status,
      channelLabel: (channel) =>
        t(`channel.${channel}` as TranslationKey) || channel,
      callOutcomeLabel: (outcome) => {
        const key = `callOutcome.${outcome}` as TranslationKey;
        return key in translations.sr ? t(key) : outcome;
      },
      dayLabel: (day) => t(`day.${day}` as TranslationKey) || day,
      featureLabel: (featureKey) =>
        t(`feature.${featureKey}` as TranslationKey) || featureKey,
      roleLabel: (role) => t(`role.${role}` as TranslationKey) || role,
      formatTime: (value) =>
        new Date(value).toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
        }),
      formatDate: (value) =>
        language === 'sr'
          ? formatSerbianDate(value)
          : new Date(value).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
      formatReadableDate: (date) => {
        const dateValue = new Date(`${date}T12:00:00`);

        if (language === 'sr') {
          const weekday = capitalize(
            dateValue.toLocaleDateString(locale, { weekday: 'long' }),
          );
          return `${weekday}, ${formatSerbianDate(dateValue)}`;
        }

        return dateValue.toLocaleDateString(locale, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      },
      mapError: (error) => translateError(error, t),
    }),
    [language, locale, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}

export function translateError(
  error: unknown,
  t: (key: TranslationKey, params?: TranslationParams) => string,
) {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.trim();
  const apiKey = normalized.toUpperCase().replace(/[\s-]+/g, '_');
  const knownApiKey = `api.${apiKey}` as TranslationKey;

  if (knownApiKey in translations.sr) {
    return t(knownApiKey);
  }

  const lowerMessage = normalized.toLowerCase();

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('session')) {
    return t('api.UNAUTHORIZED');
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('insufficient')) {
    return t('api.FORBIDDEN');
  }

  if (!normalized) {
    return t('api.GENERIC');
  }

  return normalized;
}
