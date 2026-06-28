import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Clock, History, Plus, ShieldOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  Appointment,
  AuthUser,
  RecentCall,
  SalonSettings,
  TodaySummary,
} from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { AppointmentCard } from '../components/AppointmentCard';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { QuickActionCard } from '../components/QuickActionCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

type TodayScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
  onOpenAdd: () => void;
  onOpenTimeBlocks: () => void;
  onOpenAppointment: (appointmentId: string) => void;
};

export function TodayScreen({
  api,
  salon,
  user,
  onOpenAdd,
  onOpenTimeBlocks,
  onOpenAppointment,
}: TodayScreenProps) {
  const { callOutcomeLabel, formatTime, mapError, t } = useI18n();
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadToday() {
    setError('');

    try {
      const [todayResponse, callsResponse] = await Promise.all([
        api.today(),
        api.recentCalls(),
      ]);
      setSummary(todayResponse);
      setCalls(callsResponse);
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadToday();
    }, [api]),
  );

  if (loading) {
    return (
      <AppScreen>
        <AppHeader
          aiEnabled={salon.receptionistEnabled}
          salonName={salon.name}
          userEmail={user.email}
        />
        <LoadingState message={t('today.loading')} />
      </AppScreen>
    );
  }

  if (error || !summary) {
    return (
      <AppScreen>
        <AppHeader
          aiEnabled={salon.receptionistEnabled}
          salonName={salon.name}
          userEmail={user.email}
        />
        <ErrorState message={error || t('today.loadError')} onAction={loadToday} />
      </AppScreen>
    );
  }

  const bookedAppointments = summary.appointments.filter(
    (appointment) => appointment.status === 'BOOKED',
  );

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <NextAppointmentCard appointment={summary.nextAppointment} />

      <View style={styles.statsRow}>
        <StatCard label={t('today.booked')} value={summary.stats.booked} />
        <StatCard label={t('today.completed')} tone="success" value={summary.stats.completed} />
        <StatCard label={t('today.cancelled')} tone="danger" value={summary.stats.cancelled} />
      </View>

      <View style={styles.quickRow}>
        <QuickActionCard
          icon={Plus}
          onPress={onOpenAdd}
          subtitle={t('today.findSlot')}
          title={t('today.newAppointment')}
        />
        <QuickActionCard
          icon={ShieldOff}
          onPress={onOpenTimeBlocks}
          subtitle={t('today.pauseCalendar')}
          title={t('today.blockTime')}
        />
        <QuickActionCard
          icon={History}
          subtitle={t('common.comingSoon')}
          title={t('today.callHistory')}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('today.timeline')} />
        {bookedAppointments.length === 0 ? (
          <EmptyState message={t('today.noAppointments')} />
        ) : (
          <View style={styles.list}>
            {bookedAppointments.map((appointment) => (
              <AppointmentCard
                appointment={appointment}
                key={appointment.id}
                onPress={() => onOpenAppointment(appointment.id)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('today.recentCalls')} />
        <Card>
          {calls.length === 0 ? (
            <Text style={styles.muted}>{t('today.noRecentCalls')}</Text>
          ) : (
            calls.map((call) => (
              <View key={call.id} style={styles.callRow}>
                <Text style={styles.callPhone}>
                  {call.customerPhone ?? t('common.unknownCaller')}
                </Text>
                <Text style={styles.muted}>
                  {callOutcomeLabel(call.outcome)}, {formatTime(call.startedAt)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </View>
    </AppScreen>
  );
}

function NextAppointmentCard({
  appointment,
}: {
  appointment: Appointment | null;
}) {
  const { formatTime, t } = useI18n();

  return (
    <Card>
      <View style={styles.nextHeader}>
        <Text style={styles.cardLabel}>{t('today.nextAppointment')}</Text>
        <Clock color={theme.colors.primary} size={18} strokeWidth={2.4} />
      </View>
      {appointment ? (
        <>
          <Text style={styles.nextTime}>{formatTime(appointment.startAt)}</Text>
          <Text style={styles.nextCustomer}>{appointment.customerName}</Text>
          <Text style={styles.nextMeta}>
            {t('today.serviceWithWorker', {
              service: appointment.serviceName,
              worker: appointment.workerName,
            })}
          </Text>
        </>
      ) : (
        <Text style={styles.emptyNext}>{t('today.noMoreAppointments')}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  section: {
    gap: theme.spacing[3],
  },
  list: {
    gap: theme.spacing[3],
  },
  nextHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  nextTime: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  nextCustomer: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  nextMeta: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  emptyNext: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
  },
  muted: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  callRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: theme.spacing[3],
  },
  callPhone: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
});
