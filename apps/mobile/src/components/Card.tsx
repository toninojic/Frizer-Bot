import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    ...theme.shadow,
  },
});
