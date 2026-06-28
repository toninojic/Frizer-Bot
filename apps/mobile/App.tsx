import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthUser, createApiClient, SalonSettings } from './src/api/client';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from './src/auth/tokenStorage';
import { LoginScreen } from './src/screens/LoginScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { PlatformAdminNavigator } from './src/navigation/PlatformAdminNavigator';
import { I18nProvider } from './src/i18n';
import { AppScreen } from './src/components/AppScreen';
import { theme } from './src/theme/theme';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function resetSession() {
    await clearStoredAccessToken();
    setAccessToken(null);
    setUser(null);
    setSalon(null);
  }

  const api = useMemo(
    () =>
      createApiClient({
        getAccessToken: () => accessToken,
        onUnauthorized: resetSession,
      }),
    [accessToken],
  );

  async function loadSession(token: string) {
    const sessionApi = createApiClient({
      getAccessToken: () => token,
      onUnauthorized: resetSession,
    });
    const me = await sessionApi.me();
    const settings =
      me.role === 'SALON_OWNER' ? await sessionApi.salonSettings() : null;

    setAccessToken(token);
    setUser(me);
    setSalon(settings);
  }

  useEffect(() => {
    async function bootstrap() {
      const token = await getStoredAccessToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await loadSession(token);
      } catch {
        await resetSession();
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function handleLogin(email: string, password: string) {
    const loginApi = createApiClient({
      getAccessToken: () => null,
      onUnauthorized: resetSession,
    });
    const loginResponse = await loginApi.login(email, password);

    await storeAccessToken(loginResponse.accessToken);
    await loadSession(loginResponse.accessToken);
  }

  let content = <LoginScreen onLogin={handleLogin} />;

  if (loading) {
    content = (
      <AppScreen contentContainerStyle={styles.loading} scroll={false}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </AppScreen>
    );
  } else if (accessToken && user?.role === 'PLATFORM_ADMIN') {
    content = (
      <PlatformAdminNavigator
        api={api}
        onLogout={resetSession}
        user={user}
      />
    );
  } else if (accessToken && user?.role === 'SALON_OWNER' && salon) {
    content = (
      <AppNavigator
        api={api}
        onLogout={resetSession}
        onSalonUpdated={setSalon}
        salon={salon}
        user={user}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <I18nProvider>
        {content}
        <StatusBar style="dark" />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
