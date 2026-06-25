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
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [api]);

  async function addService() {
    const payload = servicePayload(form);

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
      setNotice('Service saved');
      await loadServices(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
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
    const payload = servicePayload(editingForm);

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
      setNotice('Service updated');
      await loadServices(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
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
        setNotice('Service reactivated');
      } else {
        await api.deactivateService(service.id);
        setNotice('Service deactivated');
      }

      await loadServices(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  const activeServices = services.filter((service) => service.isActive);
  const inactiveServices = services.filter((service) => !service.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle="Set services and durations used by booking."
      title="Services"
    >
      <ServiceFormCard
        form={form}
        onChange={setForm}
        onSubmit={addService}
        saving={saving}
        submitLabel="Add service"
      />

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : services.length === 0 ? (
        <DashboardNotice message="No services yet" />
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
            <Text style={styles.sectionLabel}>Inactive</Text>
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
  return (
    <DashboardCard>
      <DashboardField
        label="Name"
        onChangeText={(name) => onChange({ ...form, name })}
        placeholder="Sisanje"
        value={form.name}
      />
      <DashboardField
        keyboardType="number-pad"
        label="Duration minutes"
        onChangeText={(durationMinutes) =>
          onChange({ ...form, durationMinutes })
        }
        placeholder="30"
        value={form.durationMinutes}
      />
      <DashboardField
        keyboardType="decimal-pad"
        label="Price optional"
        onChangeText={(priceAmount) => onChange({ ...form, priceAmount })}
        placeholder="2500"
        value={form.priceAmount}
      />
      <DashboardButton
        disabled={saving}
        label={saving ? 'Saving...' : submitLabel}
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
  const isEditing = editingId === service.id;

  return (
    <DashboardCard>
      {isEditing ? (
        <>
          <DashboardField
            label="Name"
            onChangeText={(name) =>
              onSetEditingForm({ ...editingForm, name })
            }
            value={editingForm.name}
          />
          <DashboardField
            keyboardType="number-pad"
            label="Duration minutes"
            onChangeText={(durationMinutes) =>
              onSetEditingForm({ ...editingForm, durationMinutes })
            }
            value={editingForm.durationMinutes}
          />
          <DashboardField
            keyboardType="decimal-pad"
            label="Price optional"
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
                ? ` · ${formatPrice(service.priceAmount)}`
                : ''}
            </Text>
          </View>
          <Text style={[styles.status, !service.isActive ? styles.inactive : null]}>
            {service.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <DashboardButton
              disabled={working}
              label={working ? 'Saving...' : 'Save'}
              onPress={onSave}
            />
            <DashboardButton
              disabled={working}
              label="Cancel"
              onPress={onCancelEditing}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <DashboardButton label="Edit" onPress={onEdit} variant="secondary" />
            {service.isActive ? (
              <DashboardButton
                disabled={working}
                label={working ? 'Saving...' : 'Deactivate'}
                onPress={onDeactivate}
                variant="danger"
              />
            ) : (
              <DashboardButton
                disabled={working}
                label={working ? 'Saving...' : 'Reactivate'}
                onPress={onReactivate}
              />
            )}
          </>
        )}
      </View>
    </DashboardCard>
  );
}

function servicePayload(form: ServiceForm):
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
    return { error: 'Service name is required' };
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { error: 'Duration must be a positive number of minutes' };
  }

  if (priceAmount !== null && (!Number.isFinite(priceAmount) || priceAmount <= 0)) {
    return { error: 'Price must be positive when provided' };
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
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
