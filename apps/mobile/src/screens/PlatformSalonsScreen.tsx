import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, AuthUser, PlatformSalonSummary } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { FormInput } from '../components/FormInput';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { PlatformHeader, platformStyles } from './platformAdminUi';

type Filter = 'all' | 'active' | 'inactive';

type PlatformSalonsScreenProps = {
  api: ApiClient;
  user: AuthUser;
  onOpenSalon: (salonId: string) => void;
};

export function PlatformSalonsScreen({
  api,
  user,
  onOpenSalon,
}: PlatformSalonsScreenProps) {
  const { mapError, t } = useI18n();
  const [salons, setSalons] = useState<PlatformSalonSummary[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setSalons(await api.adminSalons());
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleSalons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return salons.filter((salon) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && salon.isActive) ||
        (filter === 'inactive' && !salon.isActive);
      const matchesSearch =
        !query ||
        salon.name.toLowerCase().includes(query) ||
        salon.phone.toLowerCase().includes(query) ||
        (salon.city ?? '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, salons, search]);

  return (
    <AppScreen>
      <PlatformHeader user={user} />

      <View style={platformStyles.titleBlock}>
        <Text style={platformStyles.screenTitle}>{t('platform.salons.title')}</Text>
        <Text style={platformStyles.subtitle}>{t('platform.salons.subtitle')}</Text>
      </View>

      <FormInput
        label={t('common.search')}
        onChangeText={setSearch}
        placeholder={t('platform.salons.searchPlaceholder')}
        value={search}
      />

      <View style={styles.filters}>
        {(['all', 'active', 'inactive'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filter, filter === item ? styles.filterActive : null]}
          >
            <Text
              style={[
                styles.filterText,
                filter === item ? styles.filterTextActive : null,
              ]}
            >
              {filterLabel(item, t)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? <LoadingState message={t('platform.salons.loading')} /> : null}
      {error ? <ErrorState message={error} onAction={load} /> : null}
      {!loading && !error && visibleSalons.length === 0 ? (
        <EmptyState message={t('platform.salons.empty')} />
      ) : null}

      {!loading && !error
        ? visibleSalons.map((salon) => (
            <Pressable key={salon.id} onPress={() => onOpenSalon(salon.id)}>
              <Card>
                <View style={platformStyles.row}>
                  <View style={styles.cardText}>
                    <Text style={styles.salonName}>{salon.name}</Text>
                    <Text style={styles.meta}>{salon.city ?? t('common.noCity')}</Text>
                  </View>
                  <StatusBadge
                    label={salon.isActive ? t('common.active') : t('common.inactive')}
                    tone={salon.isActive ? 'success' : 'danger'}
                  />
                </View>
                <View style={styles.stats}>
                  <SmallStat label={t('platform.salons.ai')} value={salon.receptionistEnabled ? t('platform.salons.aiOn') : t('platform.salons.aiOff')} />
                  <SmallStat label={t('platform.salons.workers')} value={salon.workersCount} />
                  <SmallStat label={t('platform.salons.today')} value={salon.appointmentsToday} />
                  <SmallStat label={t('platform.salons.calls')} value={salon.callsToday} />
                </View>
              </Card>
            </Pressable>
          ))
        : null}
    </AppScreen>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function filterLabel(filter: Filter, t: ReturnType<typeof useI18n>['t']) {
  if (filter === 'active') {
    return t('platform.salons.active');
  }

  if (filter === 'inactive') {
    return t('platform.salons.inactive');
  }

  return t('platform.salons.all');
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  filter: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
  },
  filterActive: {
    backgroundColor: '#F0F2FF',
    borderColor: theme.colors.primarySoft,
  },
  filterText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  filterTextActive: {
    color: theme.colors.primary,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  salonName: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  smallStat: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.medium,
    minWidth: '22%',
    padding: theme.spacing[3],
  },
  smallStatValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  smallStatLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.tiny,
    fontWeight: '800',
    marginTop: 2,
  },
});
