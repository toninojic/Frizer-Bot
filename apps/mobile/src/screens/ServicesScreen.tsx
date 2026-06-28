import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, Service } from '../api/client';
import {
  DashboardButton,
  DashboardCard,
  DashboardField,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';
import { useI18n } from '../i18n';

type ServicesScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

type ServiceForm = {
  name: string;
  durationMinutes: string;
  priceAmount: string;
};

const emptyForm: ServiceForm = {
  name: '',
  durationMinutes: '',
  priceAmount: '',
};

export function ServicesScreen({ api, onBack }: ServicesScreenProps) {
  const { mapError, t } = useI18n();
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ServiceForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadServices(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
    }

    setError('');

    try {
      setServices(await api.services());
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [api]);

  async function addService() {
    const payload = servicePayload(form, t);

    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.createService(payload);
      setForm(emptyForm);
      setNotice(t('services.saved'));
      await loadServices(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(service: Service) {
    setEditingId(service.id);
    setEditingForm({
      name: service.name,
      durationMinutes: String(service.durationMinutes),
      priceAmount:
        service.priceAmount === null ? '' : String(service.priceAmount),
    });
    setError('');
    setNotice('');
  }

  async function saveService(service: Service) {
    const payload = servicePayload(editingForm, t);

    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setWorkingId(service.id);
    setError('');
    setNotice('');

    try {
      await api.updateService(service.id, payload);
      setEditingId(null);
      setEditingForm(emptyForm);
      setNotice(t('services.updated'));
      await loadServices(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  async function setServiceActive(service: Service, isActive: boolean) {
    setWorkingId(service.id);
    setError('');
    setNotice('');

    try {
      if (isActive) {
        await api.updateService(service.id, { isActive: true });
        setNotice(t('services.reactivated'));
      } else {
        await api.deactivateService(service.id);
        setNotice(t('services.deactivated'));
      }

      await loadServices(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  const activeServices = services.filter((service) => service.isActive);
  const inactiveServices = services.filter((service) => !service.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle={t('services.subtitle')}
      title={t('services.title')}
    >
      <ServiceFormCard
        form={form}
        onChange={setForm}
        onSubmit={addService}
        saving={saving}
        submitLabel={t('services.add')}
      />

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : services.length === 0 ? (
        <DashboardNotice message={t('services.empty')} />
      ) : (
        <View style={styles.list}>
          {activeServices.map((service) => (
            <ServiceCard
              editingForm={editingForm}
              editingId={editingId}
              key={service.id}
              onCancelEditing={() => setEditingId(null)}
              onDeactivate={() => setServiceActive(service, false)}
              onEdit={() => startEditing(service)}
              onSave={() => saveService(service)}
              onSetEditingForm={setEditingForm}
              service={service}
              working={workingId === service.id}
            />
          ))}

          {inactiveServices.length > 0 ? (
            <Text style={styles.sectionLabel}>{t('services.inactiveSection')}</Text>
          ) : null}

          {inactiveServices.map((service) => (
            <ServiceCard
              editingForm={editingForm}
              editingId={editingId}
              key={service.id}
              onCancelEditing={() => setEditingId(null)}
              onDeactivate={() => setServiceActive(service, false)}
              onEdit={() => startEditing(service)}
              onReactivate={() => setServiceActive(service, true)}
              onSave={() => saveService(service)}
              onSetEditingForm={setEditingForm}
              service={service}
              working={workingId === service.id}
            />
          ))}
        </View>
      )}
    </DashboardLayout>
  );
}

type ServiceFormCardProps = {
  form: ServiceForm;
  onChange: (form: ServiceForm) => void;
  onSubmit: () => void;
  saving: boolean;
  submitLabel: string;
};

function ServiceFormCard({
  form,
  onChange,
  onSubmit,
  saving,
  submitLabel,
}: ServiceFormCardProps) {
  const { t } = useI18n();

  return (
    <DashboardCard>
      <DashboardField
        label={t('services.name')}
        onChangeText={(name) => onChange({ ...form, name })}
        placeholder="Sisanje"
        value={form.name}
      />
      <DashboardField
        keyboardType="number-pad"
        label={t('services.durationMinutes')}
        onChangeText={(durationMinutes) =>
          onChange({ ...form, durationMinutes })
        }
        placeholder="30"
        value={form.durationMinutes}
      />
      <DashboardField
        keyboardType="decimal-pad"
        label={t('services.priceOptional')}
        onChangeText={(priceAmount) => onChange({ ...form, priceAmount })}
        placeholder="2500"
        value={form.priceAmount}
      />
      <DashboardButton
        disabled={saving}
        label={saving ? t('common.saving') : submitLabel}
        onPress={onSubmit}
      />
    </DashboardCard>
  );
}

type ServiceCardProps = {
  service: Service;
  editingId: string | null;
  editingForm: ServiceForm;
  working: boolean;
  onSetEditingForm: (form: ServiceForm) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEditing: () => void;
  onDeactivate: () => void;
  onReactivate?: () => void;
};

function ServiceCard({
  service,
  editingId,
  editingForm,
  working,
  onSetEditingForm,
  onEdit,
  onSave,
  onCancelEditing,
  onDeactivate,
  onReactivate,
}: ServiceCardProps) {
  const { t } = useI18n();
  const isEditing = editingId === service.id;

  return (
    <DashboardCard>
      {isEditing ? (
        <>
          <DashboardField
            label={t('services.name')}
            onChangeText={(name) =>
              onSetEditingForm({ ...editingForm, name })
            }
            value={editingForm.name}
          />
          <DashboardField
            keyboardType="number-pad"
            label={t('services.durationMinutes')}
            onChangeText={(durationMinutes) =>
              onSetEditingForm({ ...editingForm, durationMinutes })
            }
            value={editingForm.durationMinutes}
          />
          <DashboardField
            keyboardType="decimal-pad"
            label={t('services.priceOptional')}
            onChangeText={(priceAmount) =>
              onSetEditingForm({ ...editingForm, priceAmount })
            }
            value={editingForm.priceAmount}
          />
        </>
      ) : (
        <View style={styles.cardHeader}>
          <View style={styles.serviceText}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceMeta}>
              {service.durationMinutes} min
              {service.priceAmount !== null
                ? ` - ${formatPrice(service.priceAmount)}`
                : ''}
            </Text>
          </View>
          <Text style={[styles.status, !service.isActive ? styles.inactive : null]}>
            {service.isActive ? t('common.active') : t('common.inactive')}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <DashboardButton
              disabled={working}
              label={working ? t('common.saving') : t('common.save')}
              onPress={onSave}
            />
            <DashboardButton
              disabled={working}
              label={t('common.cancel')}
              onPress={onCancelEditing}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <DashboardButton label={t('common.edit')} onPress={onEdit} variant="secondary" />
            {service.isActive ? (
              <DashboardButton
                disabled={working}
                label={working ? t('common.saving') : t('services.deactivate')}
                onPress={onDeactivate}
                variant="danger"
              />
            ) : (
              <DashboardButton
                disabled={working}
                label={working ? t('common.saving') : t('services.reactivate')}
                onPress={onReactivate}
              />
            )}
          </>
        )}
      </View>
    </DashboardCard>
  );
}

function servicePayload(
  form: ServiceForm,
  t: ReturnType<typeof useI18n>['t'],
):
  | {
      name: string;
      durationMinutes: number;
      priceAmount: number | null;
    }
  | { error: string } {
  const name = form.name.trim();
  const durationMinutes = Number(form.durationMinutes);
  const priceAmount =
    form.priceAmount.trim() === '' ? null : Number(form.priceAmount);

  if (!name) {
    return { error: t('services.nameRequired') };
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { error: t('services.durationInvalid') };
  }

  if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount <= 0)) {
    return { error: t('services.priceInvalid') };
  }

  return {
    name,
    durationMinutes,
    priceAmount,
  };
}

function formatPrice(priceAmount: number) {
  return `${priceAmount.toLocaleString()} RSD`;
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  serviceText: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    color: dashboardColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  serviceMeta: {
    color: dashboardColors.muted,
    fontSize: 14,
  },
  status: {
    color: '#027a48',
    fontSize: 13,
    fontWeight: '800',
  },
  inactive: {
    color: dashboardColors.muted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: {
    color: dashboardColors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
