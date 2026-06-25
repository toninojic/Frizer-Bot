import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SalonSettings } from '../api/client';

type SettingsScreenProps = {
  salon: SalonSettings;
  onBack: () => void;
};

export function SettingsScreen({ salon, onBack }: SettingsScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Settings</Text>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <SettingRow label="Salon" value={salon.name} />
          <SettingRow
            label="Receptionist"
            value={salon.receptionistName ?? 'Not set'}
          />
          <SettingRow
            label="Welcome message"
            value={salon.welcomeMessage ?? 'Not set'}
          />
          <SettingRow label="Transfer phone" value={salon.transferPhone ?? '-'} />
          <SettingRow
            label="SMS confirmations"
            value={salon.smsConfirmationsEnabled ? 'Enabled' : 'Disabled'}
          />
          <SettingRow
            label="Reminder"
            value={`${salon.reminderHoursBefore}h before`}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f4',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  backButton: {
    borderColor: '#98a2b3',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  backButtonText: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    borderBottomColor: '#eaecf0',
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 14,
  },
  label: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '600',
  },
});
