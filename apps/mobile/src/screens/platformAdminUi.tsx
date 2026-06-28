import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AuthUser } from '../api/client';
import { Card } from '../components/Card';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

export function PlatformHeader({ user }: { user: AuthUser }) {
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>{t('platform.header')}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>
    </View>
  );
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? '-'}</Text>
    </View>
  );
}

export function PreviewCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.preview}>
      <Text style={styles.previewTitle}>{title}</Text>
      <Card>{children}</Card>
    </View>
  );
}

export const platformStyles = StyleSheet.create({
  titleBlock: {
    gap: 4,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.screenTitle,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  section: {
    gap: theme.spacing[3],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
  },
  error: {
    color: '#B42318',
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F0F2FF',
    borderColor: '#DEE4FF',
    borderRadius: theme.radius.large,
    borderWidth: 1,
    padding: theme.spacing[4],
  },
  kicker: {
    color: theme.colors.primary,
    fontSize: theme.typography.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  email: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
    marginTop: 4,
  },
  metric: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    minWidth: '46%',
    padding: theme.spacing[4],
    ...theme.shadow,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  metricLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '700',
    marginTop: 4,
  },
  detailRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: theme.spacing[3],
  },
  detailLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  preview: {
    gap: theme.spacing[3],
  },
  previewTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
});
