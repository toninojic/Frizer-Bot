import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { apiConfig } from '../config/api';
import { useI18n } from '../i18n';

export function MvpHomeScreen() {
  const { t } = useI18n();

  return (
    <AppScreen
      backgroundColor="#f7f5f0"
      contentContainerStyle={styles.container}
      scroll={false}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t('mvp.foundation')}</Text>
      </View>
      <Text style={styles.title}>{t('mvp.title')}</Text>
      <Text style={styles.subtitle}>
        {t('mvp.backend', { url: apiConfig.baseUrl })}
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
