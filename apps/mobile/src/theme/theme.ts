import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export const radius = {
  small: 10,
  medium: 16,
  large: 20,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 1,
} as const;

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  shadow,
} as const;

export type AppTheme = typeof theme;
