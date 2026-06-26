import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ApiClient, Customer } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { SectionHeader } from '../components/SectionHeader';
import { theme } from '../theme/theme';
import { errorMessage, formatPhone } from '../utils/formatting';

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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCustomer() {
    setLoading(true);
    setError('');

    try {
      setCustomer(await api.customer(customerId));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  return (
    <AppScreen>
      <Button label="Back" onPress={onBack} variant="secondary" />
      {loading ? (
        <LoadingState message="Loading customer..." />
      ) : error ? (
        <ErrorState message={error} onAction={loadCustomer} />
      ) : customer ? (
        <>
          <View style={styles.titleBlock}>
            <Text style={styles.screenTitle}>{customer.name}</Text>
            <Text style={styles.subtitle}>{formatPhone(customer.phone)}</Text>
          </View>
          <Card>
            <Text style={styles.label}>Visit count</Text>
            <Text style={styles.value}>{customer.visitCount}</Text>
          </Card>
          <SectionHeader title="Appointment history" />
          <Card>
            <EmptyState message="Appointment history will appear here later." />
          </Card>
        </>
      ) : (
        <EmptyState message="Customer not found." />
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
