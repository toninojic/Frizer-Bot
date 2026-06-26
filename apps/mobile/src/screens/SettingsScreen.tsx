import { useState } from 'react';
import type { ComponentType } from 'react';
import { Briefcase, CalendarClock, Clock, Scissors, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, AuthUser, SalonSettings } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { theme } from '../theme/theme';
import { errorMessage } from '../utils/formatting';

type SettingsScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
  onLogout: () => void;
  onSalonUpdated: (salon: SalonSettings) => void;
  onOpenWorkers: () => void;
  onOpenServices: () => void;
  onOpenWorkingHours: () => void;
  onOpenTimeBlocks: () => void;
};

export function SettingsScreen({
  api,
  salon,
  user,
  onLogout,
  onSalonUpdated,
  onOpenWorkers,
  onOpenServices,
  onOpenWorkingHours,
  onOpenTimeBlocks,
}: SettingsScreenProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function updateSettings(patch: Partial<SalonSettings>) {
    setSaving(true);
    setError('');

    try {
      onSalonUpdated(await api.updateSalonSettings(patch));
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>Settings</Text>
        <Text style={styles.subtitle}>Salon setup and operations.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <SectionHeader title="Salon" />
        <Card>
          <DetailRow label="Name" value={salon.name} />
          <DetailRow label="Phone" value={salon.phone} />
          <DetailRow label="Timezone" value={salon.timezone} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="AI Receptionist" />
        <Card>
          <ToggleRow
            disabled={saving}
            label="AI enabled"
            onValueChange={(value) =>
              updateSettings({ receptionistEnabled: value })
            }
            value={salon.receptionistEnabled}
          />
          <DetailRow
            label="Receptionist name"
            value={salon.receptionistName ?? 'Not set'}
          />
          <DetailRow
            label="Welcome message"
            value={salon.welcomeMessage ?? 'Not set'}
          />
          <DetailRow label="Transfer phone" value={salon.transferPhone ?? '-'} />
          <ToggleRow
            disabled={saving}
            label="SMS confirmations"
            onValueChange={(value) =>
              updateSettings({ smsConfirmationsEnabled: value })
            }
            value={salon.smsConfirmationsEnabled}
          />
          <DetailRow
            label="Reminder"
            value={`${salon.reminderHoursBefore}h before`}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Operations" />
        <Card>
          <SettingsLink
            icon={Users}
            onPress={onOpenWorkers}
            subtitle="Staff who can take appointments"
            title="Workers"
          />
          <SettingsLink
            icon={Scissors}
            onPress={onOpenServices}
            subtitle="Durations and prices"
            title="Services"
          />
          <SettingsLink
            icon={Clock}
            onPress={onOpenWorkingHours}
            subtitle="Weekly opening schedule"
            title="Working Hours"
          />
          <SettingsLink
            icon={CalendarClock}
            onPress={onOpenTimeBlocks}
            subtitle="Vacations, breaks, holidays"
            title="Blocked Time"
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        <Button icon={Briefcase} label="Log out" onPress={onLogout} variant="secondary" />
      </View>
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

function ToggleRow({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.detailValue}>{label}</Text>
      <ToggleSwitch
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function SettingsLink({
  title,
  subtitle,
  icon: Icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <View style={styles.iconWrap}>
        <Icon color={theme.colors.primary} size={20} strokeWidth={2.4} />
      </View>
      <View style={styles.linkText}>
        <Text style={styles.detailValue}>{title}</Text>
        <Text style={styles.detailLabel}>{subtitle}</Text>
      </View>
    </Pressable>
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
  section: {
    gap: theme.spacing[3],
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
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  linkText: {
    flex: 1,
    gap: 3,
  },
  error: {
    color: '#B42318',
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
});
