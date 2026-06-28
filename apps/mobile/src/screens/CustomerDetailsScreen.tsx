import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ApiClient, Customer } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { SectionHeader } from '../components/SectionHeader';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { formatPhone } from '../utils/formatting';

type CustomerDetailsScreenProps = {
  api: ApiClient;
  customerId: string;
  onBack: () => void;
};

export function CustomerDetailsScreen({
  api,
  customerId,
  onBack,
}: CustomerDetailsScreenProps) {
  const { mapError, t } = useI18n();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCustomer() {
    setLoading(true);
    setError('');

    try {
      setCustomer(await api.customer(customerId));
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  return (
    <AppScreen>
      <Button label={t('common.back')} onPress={onBack} variant="secondary" />
      {loading ? (
        <LoadingState message={t('client.loading')} />
      ) : error ? (
        <ErrorState message={error} onAction={loadCustomer} />
      ) : customer ? (
        <>
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>{customer.name}</Text>
            <Text style={styles.subtitle}>{formatPhone(customer.phone)}</Text>
          </View>
          <Card>
            <Text style={styles.label}>{t('client.visitCount')}</Text>
            <Text style={styles.value}>{customer.visitCount}</Text>
          </Card>
          <SectionHeader title={t('client.history')} />
          <Card>
            <EmptyState message={t('client.historyLater')} />
          </Card>
        </>
      ) : (
        <EmptyState message={t('client.notFound')} />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: 4,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.screenTitle,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  label: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  value: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
});
