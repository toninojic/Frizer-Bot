import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type StatusBadgeProps = {
  label: string;
  tone?: 'success' | 'danger' | 'warning' | 'neutral';
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
  },
  success: {
    backgroundColor: theme.colors.greenSoft,
  },
  danger: {
    backgroundColor: theme.colors.redSoft,
  },
  warning: {
    backgroundColor: theme.colors.yellowSoft,
  },
  neutral: {
    backgroundColor: theme.colors.border,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
  },
});
