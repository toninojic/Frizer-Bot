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
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { formatPhone } from '../utils/formatting';

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
  const { mapError, t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadCustomers() {
    setError('');

    try {
      setCustomers(await api.customers({ search }));
    } catch (loadError) {
      setError(mapError(loadError));
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
        <Text style={styles.screenTitle}>{t('clients.title')}</Text>
        <Text style={styles.subtitle}>{t('clients.subtitle')}</Text>
      </View>

      <FormInput
        label={t('common.search')}
        onChangeText={setSearch}
        placeholder={t('clients.placeholder')}
        value={search}
      />

      <SectionHeader title={t('clients.list')} />
      {loading ? (
        <LoadingState message={t('clients.loading')} />
      ) : error ? (
        <ErrorState message={error} onAction={loadCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState message={t('clients.empty')} />
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
                  {t('clients.visits', { count: customer.visitCount })}
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
