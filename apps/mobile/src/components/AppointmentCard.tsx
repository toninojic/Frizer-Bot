import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Appointment } from '../api/client';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { StatusBadge } from './StatusBadge';

type AppointmentCardProps = {
  appointment: Appointment;
  onPress?: () => void;
};

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const { formatTime, statusLabel } = useI18n();

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.time}>{formatTime(appointment.startAt)}</Text>
      <View style={styles.body}>
        <Text style={styles.customer}>{appointment.customerName}</Text>
        <Text style={styles.meta}>
          {appointment.serviceName} · {appointment.workerName}
        </Text>
      </View>
      <StatusBadge
        label={statusLabel(appointment.status)}
        tone={appointment.status === 'CANCELLED' ? 'danger' : 'success'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
  },
  time: {
    color: theme.colors.primary,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
    minWidth: 50,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  customer: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
  },
  meta: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
});
