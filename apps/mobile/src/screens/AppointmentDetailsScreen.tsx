import { useEffect, useState } from 'react';
import { Phone, RotateCcw, Send } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { ApiClient, Appointment } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { formatPhone } from '../utils/formatting';

type AppointmentDetailsScreenProps = {
  api: ApiClient;
  appointmentId: string;
  onBack: () => void;
};

export function AppointmentDetailsScreen({
  api,
  appointmentId,
  onBack,
}: AppointmentDetailsScreenProps) {
  const {
    channelLabel,
    formatReadableDate,
    formatTime,
    mapError,
    statusLabel,
    t,
  } = useI18n();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadAppointment() {
    setLoading(true);
    setError('');

    try {
      setAppointment(await api.appointment(appointmentId));
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment() {
    if (!appointment) {
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      setAppointment(await api.cancelBooking({ appointmentId: appointment.id }));
      setNotice(t('appointment.cancelledNotice'));
    } catch (cancelError) {
      setError(mapError(cancelError));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  return (
    <AppScreen>
      <Button label={t('common.back')} onPress={onBack} variant="secondary" />
      {loading ? (
        <LoadingState message={t('appointment.loading')} />
      ) : error ? (
        <ErrorState message={error} onAction={loadAppointment} />
      ) : appointment ? (
        <>
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>{appointment.customerName}</Text>
            <Text style={styles.subtitle}>
              {formatReadableDate(appointment.startAt.slice(0, 10))},{' '}
              {formatTime(appointment.startAt)}-{formatTime(appointment.endAt)}
            </Text>
          </View>

          <Card>
            <View style={styles.statusRow}>
              <Text style={styles.cardTitle}>{t('appointment.title')}</Text>
              <StatusBadge
                label={statusLabel(appointment.status)}
                tone={appointment.status === 'CANCELLED' ? 'danger' : 'success'}
              />
            </View>
            <DetailRow label={t('appointment.phone')} value={formatPhone(appointment.customerPhone)} />
            <DetailRow label={t('appointment.service')} value={appointment.serviceName} />
            <DetailRow label={t('appointment.worker')} value={appointment.workerName} />
            <DetailRow label={t('appointment.channel')} value={channelLabel(appointment.channel)} />
          </Card>

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <View style={styles.actions}>
            <Button
              disabled={saving || appointment.status !== 'BOOKED'}
              label={saving ? t('appointment.cancelling') : t('appointment.cancel')}
              onPress={cancelAppointment}
              variant="danger"
            />
            <Button icon={RotateCcw} label={t('appointment.rescheduleSoon')} variant="secondary" />
            <Button icon={Phone} label={t('appointment.callSoon')} variant="secondary" />
            <Button icon={Send} label={t('appointment.smsSoon')} variant="secondary" />
          </View>
        </>
      ) : (
        <EmptyState message={t('appointment.notFound')} />
      )}
    </AppScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionTitle,
    fontWeight: '900',
  },
  detailRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: theme.spacing[3],
  },
  detailLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  actions: {
    gap: theme.spacing[3],
  },
  notice: {
    color: '#027A48',
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
});
