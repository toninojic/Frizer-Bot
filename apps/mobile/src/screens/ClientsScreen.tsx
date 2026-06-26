import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Phone } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, AuthUser, Customer, SalonSettings } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { FormInput } from '../components/FormInput';
import { SectionHeader } from '../components/SectionHeader';
import { theme } from '../theme/theme';
import { errorMessage, formatPhone } from '../utils/formatting';

type ClientsScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
  onOpenCustomer: (customerId: string) => void;
};

export function ClientsScreen({
  api,
  salon,
  user,
  onOpenCustomer,
}: ClientsScreenProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCustomers() {
    setError('');

    try {
      setCustomers(await api.customers({ search }));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCustomers();
    }, [api]),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCustomers();
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>Clients</Text>
        <Text style={styles.subtitle}>Search by name or phone.</Text>
      </View>

      <FormInput
        label="Search"
        onChangeText={setSearch}
        placeholder="Marko or +381"
        value={search}
      />

      <SectionHeader title="Customer list" />
      {loading ? (
        <LoadingState message="Loading clients..." />
      ) : error ? (
        <ErrorState message={error} onAction={loadCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState message="No customers found." />
      ) : (
        <View style={styles.list}>
          {customers.map((customer) => (
            <Pressable
              key={customer.id}
              onPress={() => onOpenCustomer(customer.id)}
            >
              <Card>
                <View style={styles.customerRow}>
                  <View style={styles.customerText}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerPhone}>
                      {formatPhone(customer.phone)}
                    </Text>
                  </View>
                  <View style={styles.iconWrap}>
                    <Phone color={theme.colors.primary} size={18} />
                  </View>
                </View>
                <Text style={styles.visitText}>
                  {customer.visitCount} visits
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
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
  list: {
    gap: theme.spacing[3],
  },
  customerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  customerText: {
    flex: 1,
    gap: 3,
  },
  customerName: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  customerPhone: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  visitText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
});
