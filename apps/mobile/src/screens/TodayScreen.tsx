import { StyleSheet, Text } from 'react-native';
import {
  DashboardCard,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';

type TodayScreenProps = {
  onBack: () => void;
};

export function TodayScreen({ onBack }: TodayScreenProps) {
  return (
    <DashboardLayout
      onBack={onBack}
      subtitle="Appointments will be added in a later phase."
      title="Today"
    >
      <DashboardCard>
        <Text style={styles.title}>Appointments</Text>
        <DashboardNotice message="Appointments will appear here." />
      </DashboardCard>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    color: dashboardColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
});
