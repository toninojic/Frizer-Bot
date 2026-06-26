import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { theme } from '../theme/theme';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('owner@salonana.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      await onLogin(email.trim(), password);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Login failed',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboard}
    >
      <AppScreen>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markText}>AI</Text>
          </View>
          <Text style={styles.title}>Salon dashboard</Text>
          <Text style={styles.subtitle}>
            Manage today, bookings, clients, and receptionist settings.
          </Text>
        </View>

        <Card>
          <FormInput
            label="Email"
            onChangeText={setEmail}
            placeholder="owner@salon.local"
            value={email}
          />
          <FormInput
            label="Password"
            onChangeText={setPassword}
            placeholder="password"
            secureTextEntry
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            disabled={loading}
            label={loading ? 'Logging in...' : 'Log in'}
            onPress={handleLogin}
          />
        </Card>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  hero: {
    gap: theme.spacing[3],
    paddingTop: theme.spacing[8],
  },
  mark: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.large,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  markText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 22,
  },
  error: {
    color: '#B42318',
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
});
