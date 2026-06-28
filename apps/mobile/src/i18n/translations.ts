import { en } from './locales/en';
import { sr } from './locales/sr';

export const translations = {
  sr,
  en,
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof sr;
