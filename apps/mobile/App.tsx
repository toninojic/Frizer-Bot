import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { AuthUser, createApiClient, SalonSettings } from './src/api/client';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from './src/auth/tokenStorage';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'home' | 'settings'>('home');

  async function resetSession() {
    await clearStoredAccessToken();
    setAccessToken(null);
    setUser(null);
    setSalon(null);
    setScreen('home');
  }

  function clientForToken(token: string | null) {
    return createApiClient({
      getAccessToken: () => token,
      onUnauthorized: resetSession,
    });
  }

  async function loadSession(token: string) {
    const api = clientForToken(token);
    const [me, settings] = await Promise.all([
      api.me(),
      api.salonSettings(),
    ]);

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
    const api = clientForToken(null);
    const loginResponse = await api.login(email, password);

    await storeAccessToken(loginResponse.accessToken);
    await loadSession(loginResponse.accessToken);
  }

  let content = <LoginScreen onLogin={handleLogin} />;

  if (loading) {
    content = (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color="#135e4b" size="large" />
      </SafeAreaView>
    );
  } else if (accessToken && user && salon) {
    content =
      screen === 'settings' ? (
        <SettingsScreen salon={salon} onBack={() => setScreen('home')} />
      ) : (
        <HomeScreen
          onLogout={resetSession}
          onOpenSettings={() => setScreen('settings')}
          salon={salon}
          user={user}
        />
      );
  }

  return (
    <>
      {content}
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#f7f7f4',
    flex: 1,
    justifyContent: 'center',
  },
});
