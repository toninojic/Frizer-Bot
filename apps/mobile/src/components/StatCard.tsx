import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type StatCardProps = {
  label: string;
  value: number | string;
  tone?: 'primary' | 'success' | 'danger' | 'warning';
};

export function StatCard({ label, value, tone = 'primary' }: StatCardProps) {
  return (
    <View style={[styles.card, styles[tone]]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.medium,
    flex: 1,
    gap: 3,
    minHeight: 80,
    padding: theme.spacing[4],
  },
  primary: {
    backgroundColor: '#F0F2FF',
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
  value: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  label: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '700',
  },
});
