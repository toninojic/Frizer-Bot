import { useState } from 'react';
import { PlusCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { ApiClient, AuthUser } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { PlatformHeader, platformStyles } from './platformAdminUi';

type PlatformCreateSalonScreenProps = {
  api: ApiClient;
  user: AuthUser;
  onCreated: (salonId: string) => void;
};

export function PlatformCreateSalonScreen({
  api,
  user,
  onCreated,
}: PlatformCreateSalonScreenProps) {
  const { mapError, t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Nis');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('password123');
  const [timezone, setTimezone] = useState('Europe/Belgrade');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function createSalon() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const salon = await api.createAdminSalon({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        timezone: timezone.trim() || 'Europe/Belgrade',
      });

      setSuccess(t('platform.create.created', { name: salon.name }));
      setName('');
      setPhone('');
      setOwnerEmail('');
      onCreated(salon.id);
    } catch (createError) {
      setError(mapError(createError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <PlatformHeader user={user} />

      <View style={platformStyles.titleBlock}>
        <Text style={platformStyles.screenTitle}>{t('platform.create.title')}</Text>
        <Text style={platformStyles.subtitle}>{t('platform.create.subtitle')}</Text>
      </View>

      <Card>
        <FormInput
          label={t('platform.create.salonName')}
          onChangeText={setName}
          placeholder="Salon Example"
          value={name}
        />
        <FormInput
          keyboardType="phone-pad"
          label={t('platform.create.phone')}
          onChangeText={setPhone}
          placeholder="+38164..."
          value={phone}
        />
        <FormInput
          label={t('platform.create.city')}
          onChangeText={setCity}
          placeholder="Nis"
          value={city}
        />
        <FormInput
          autoCapitalize="none"
          keyboardType="email-address"
          label={t('platform.create.ownerEmail')}
          onChangeText={setOwnerEmail}
          placeholder="owner@example.com"
          value={ownerEmail}
        />
        <FormInput
          label={t('platform.create.ownerPassword')}
          onChangeText={setOwnerPassword}
          secureTextEntry
          value={ownerPassword}
        />
        <FormInput
          label={t('platform.create.timezone')}
          onChangeText={setTimezone}
          value={timezone}
        />
      </Card>

      {error ? <Text style={platformStyles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      <Button
        disabled={saving}
        icon={PlusCircle}
        label={saving ? t('platform.create.creating') : t('platform.create.submit')}
        onPress={createSalon}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  success: {
    color: '#027A48',
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
});
