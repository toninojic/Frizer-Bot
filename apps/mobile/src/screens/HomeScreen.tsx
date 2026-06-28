import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthUser, SalonSettings } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { useI18n } from '../i18n';

type HomeScreenProps = {
  user: AuthUser;
  salon: SalonSettings;
  onOpenServices: () => void;
  onOpenWorkers: () => void;
  onOpenWorkingHours: () => void;
  onOpenTimeBlocks: () => void;
  onOpenToday: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
};

export function HomeScreen({
  user,
  salon,
  onOpenServices,
  onOpenWorkers,
  onOpenWorkingHours,
  onOpenTimeBlocks,
  onOpenToday,
  onOpenSettings,
  onLogout,
}: HomeScreenProps) {
  const { roleLabel, t } = useI18n();
  const receptionistName = salon.receptionistName ?? t('common.notSet');

  return (
    <AppScreen backgroundColor="#f7f7f4" contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.kicker}>
            {t('home.signedInAs', { role: roleLabel(user.role) })}
          </Text>
          <Text style={styles.title}>{salon.name}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('settings.logout')}</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>{t('home.receptionist')}</Text>
        <Text style={styles.summaryTitle}>{receptionistName}</Text>
        <Text style={styles.summaryText}>
          {salon.receptionistEnabled ? t('home.enabled') : t('home.disabled')}
        </Text>
      </View>

      <View style={styles.today}>
        <Text style={styles.sectionTitle}>{t('nav.today')}</Text>
        <Text style={styles.placeholder}>{t('home.appointmentsPlaceholder')}</Text>
      </View>

      <View style={styles.actions}>
        <DashboardButton label={t('nav.today')} onPress={onOpenToday} />
        <DashboardButton label={t('services.title')} onPress={onOpenServices} />
        <DashboardButton label={t('workers.title')} onPress={onOpenWorkers} />
        <DashboardButton
          label={t('workingHours.title')}
          onPress={onOpenWorkingHours}
        />
        <DashboardButton label={t('timeBlocks.title')} onPress={onOpenTimeBlocks} />
        <DashboardButton label={t('nav.settings')} onPress={onOpenSettings} />
      </View>
    </AppScreen>
  );
}

function DashboardButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  secondaryButton: {
    borderColor: '#98a2b3',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  summaryLabel: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryTitle: {
    color: '#135e4b',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 4,
  },
  summaryText: {
    color: '#475467',
    fontSize: 15,
    marginTop: 4,
  },
  today: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '800',
  },
  placeholder: {
    color: '#667085',
    fontSize: 15,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#ebe7dc',
    borderRadius: 8,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: '#172026',
    fontSize: 15,
    fontWeight: '800',
  },
});
