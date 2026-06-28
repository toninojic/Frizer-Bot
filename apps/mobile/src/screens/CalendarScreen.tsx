import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  Appointment,
  AuthUser,
  SalonSettings,
  Worker,
} from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { AppointmentCard } from '../components/AppointmentCard';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { IconButton } from '../components/IconButton';
import { SectionHeader } from '../components/SectionHeader';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { addDays, formatDateInput } from '../utils/date';

type CalendarScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
  onOpenAppointment: (appointmentId: string) => void;
};

export function CalendarScreen({
  api,
  salon,
  user,
  onOpenAppointment,
}: CalendarScreenProps) {
  const { formatReadableDate, formatTime, mapError, t } = useI18n();
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCalendar() {
    setError('');

    try {
      const [appointmentsResponse, workersResponse] = await Promise.all([
        api.appointments({ date }),
        api.workers(),
      ]);
      setAppointments(appointmentsResponse);
      setWorkers(workersResponse);
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCalendar();
    }, [api, date]),
  );

  const activeWorkers = workers.filter((worker) => worker.isActive);
  const hasMultipleWorkers = activeWorkers.length > 1;

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <View style={styles.dateRow}>
        <IconButton
          icon={ChevronLeft}
          label={t('calendar.previousDay')}
          onPress={() => setDate(addDays(date, -1))}
        />
        <View style={styles.dateTextWrap}>
          <Text style={styles.dateTitle}>{formatReadableDate(date)}</Text>
          <Text style={styles.dateSubtitle}>{date}</Text>
        </View>
        <IconButton
          icon={ChevronRight}
          label={t('calendar.nextDay')}
          onPress={() => setDate(addDays(date, 1))}
        />
      </View>
      <Button
        label={t('calendar.today')}
        onPress={() => setDate(formatDateInput(new Date()))}
        variant="secondary"
      />

      {loading ? (
        <LoadingState message={t('calendar.loading')} />
      ) : error ? (
        <ErrorState message={error} onAction={loadCalendar} />
      ) : appointments.length === 0 ? (
        <EmptyState message={t('calendar.empty')} />
      ) : hasMultipleWorkers ? (
        <View style={styles.section}>
          {activeWorkers.map((worker) => {
            const workerAppointments = appointments.filter(
              (appointment) => appointment.workerId === worker.id,
            );

            if (workerAppointments.length === 0) {
              return null;
            }

            return (
              <View key={worker.id} style={styles.section}>
                <SectionHeader title={worker.name} />
                <Card>
                  {workerAppointments.map((appointment) => (
                    <View key={appointment.id} style={styles.timelineRow}>
                      <Text style={styles.time}>
                        {formatTime(appointment.startAt)}
                      </Text>
                      <Text style={styles.timelineText}>
                        {t('calendar.appointmentLine', {
                          customer: appointment.customerName,
                          service: appointment.serviceName,
                        })}
                      </Text>
                    </View>
                  ))}
                </Card>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.section}>
          {appointments.map((appointment) => (
            <AppointmentCard
              appointment={appointment}
              key={appointment.id}
              onPress={() => onOpenAppointment(appointment.id)}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  dateTextWrap: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  dateTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionTitle,
    fontWeight: '900',
  },
  dateSubtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  section: {
    gap: theme.spacing[3],
  },
  timelineRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  time: {
    color: theme.colors.primary,
    fontSize: theme.typography.body,
    fontWeight: '900',
    minWidth: 52,
  },
  timelineText: {
    color: theme.colors.text,
    flex: 1,
    fontSize: theme.typography.body,
    fontWeight: '700',
  },
});
