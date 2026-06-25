import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthUser, SalonSettings } from '../api/client';

type HomeScreenProps = {
  user: AuthUser;
  salon: SalonSettings;
  onOpenSettings: () => void;
  onLogout: () => void;
};

export function HomeScreen({
  user,
  salon,
  onOpenSettings,
  onLogout,
}: HomeScreenProps) {
  const receptionistName = salon.receptionistName ?? 'Receptionist';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Signed in as {user.role}</Text>
            <Text style={styles.title}>{salon.name}</Text>
          </View>
          <Pressable onPress={onLogout} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Receptionist</Text>
          <Text style={styles.summaryTitle}>{receptionistName}</Text>
          <Text style={styles.summaryText}>
            {salon.receptionistEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>

        <View style={styles.today}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.placeholder}>Appointments will appear here.</Text>
        </View>

        <View style={styles.actions}>
          <DashboardButton label="Today" />
          <DashboardButton label="Services" />
          <DashboardButton label="Workers" />
          <DashboardButton label="Settings" onPress={onOpenSettings} />
        </View>
      </View>
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f4',
  },
  container: {
    flex: 1,
    gap: 18,
    padding: 20,
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
    minHeight: 48,
    minWidth: '47%',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonText: {
    color: '#172026',
    fontSize: 15,
    fontWeight: '800',
  },
});
