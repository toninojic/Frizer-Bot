import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { mapError, t } = useI18n();
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
      setError(mapError(loginError) || t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <Text style={styles.markText}>AI</Text>
        </View>
        <Text style={styles.title}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
      </View>

      <Card>
        <FormInput
          label={t('login.email')}
          onChangeText={setEmail}
          placeholder={t('login.placeholderEmail')}
          value={email}
        />
        <FormInput
          label={t('login.password')}
          onChangeText={setPassword}
          placeholder={t('login.placeholderPassword')}
          secureTextEntry
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          disabled={loading}
          label={loading ? t('login.loading') : t('login.button')}
          onPress={handleLogin}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
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
