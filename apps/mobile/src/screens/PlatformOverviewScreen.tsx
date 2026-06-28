import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  AuthUser,
  PlatformOverview,
  PlatformSalonSummary,
} from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { ErrorState, LoadingState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import {
  MetricCard,
  PlatformHeader,
  platformStyles,
} from './platformAdminUi';

type PlatformOverviewScreenProps = {
  api: ApiClient;
  user: AuthUser;
  onOpenSalon: (salonId: string) => void;
};

export function PlatformOverviewScreen({
  api,
  user,
  onOpenSalon,
}: PlatformOverviewScreenProps) {
  const { mapError, t } = useI18n();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [salons, setSalons] = useState<PlatformSalonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [overviewData, salonData] = await Promise.all([
        api.adminOverview(),
        api.adminSalons(),
      ]);

      setOverview(overviewData);
      setSalons(salonData.slice(0, 3));
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen>
      <PlatformHeader user={user} />

      <View style={platformStyles.titleBlock}>
        <Text style={platformStyles.screenTitle}>{t('platform.overview.title')}</Text>
        <Text style={platformStyles.subtitle}>{t('platform.overview.subtitle')}</Text>
      </View>

      {loading ? <LoadingState message={t('platform.overview.loading')} /> : null}
      {error ? (
        <ErrorState message={error} onAction={load} />
      ) : null}

      {overview && !loading ? (
        <View style={platformStyles.grid}>
          <MetricCard label={t('platform.overview.totalSalons')} value={overview.totalSalons} />
          <MetricCard label={t('platform.overview.activeSalons')} value={overview.activeSalons} />
          <MetricCard
            label={t('platform.overview.appointmentsToday')}
            value={overview.totalAppointmentsToday}
          />
          <MetricCard label={t('platform.overview.callsToday')} value={overview.totalCallsToday} />
          <MetricCard
            label={t('platform.overview.smsThisMonth')}
            value={overview.totalSmsThisMonth}
          />
        </View>
      ) : null}

      {salons.length > 0 && !loading ? (
        <View style={platformStyles.section}>
          <Text style={styles.sectionTitle}>{t('platform.overview.recentSalons')}</Text>
          {salons.map((salon) => (
            <Pressable key={salon.id} onPress={() => onOpenSalon(salon.id)}>
              <Card>
                <View style={platformStyles.row}>
                  <View style={styles.cardText}>
                    <Text style={styles.salonName}>{salon.name}</Text>
                    <Text style={styles.meta}>
                      {salon.city ?? t('common.noCity')} · {salon.phone}
                    </Text>
                  </View>
                  <StatusBadge
                    label={salon.isActive ? t('common.active') : t('common.inactive')}
                    tone={salon.isActive ? 'success' : 'danger'}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  salonName: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
});
