import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { apiConfig } from '../config/api';

export function MvpHomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Foundation</Text>
        </View>
        <Text style={styles.title}>AI Salon Receptionist MVP</Text>
        <Text style={styles.subtitle}>Backend: {apiConfig.baseUrl}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f5f0',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#143d59',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#1d1d1d',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#756a5f',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
