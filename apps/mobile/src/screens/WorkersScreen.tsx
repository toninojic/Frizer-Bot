import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, Worker } from '../api/client';
import {
  DashboardButton,
  DashboardCard,
  DashboardField,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';
import { useI18n } from '../i18n';

type WorkersScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

export function WorkersScreen({ api, onBack }: WorkersScreenProps) {
  const { mapError, t } = useI18n();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadWorkers(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
    }

    setError('');

    try {
      setWorkers(await api.workers());
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkers();
  }, [api]);

  async function addWorker() {
    const name = newName.trim();

    if (!name) {
      setError(t('workers.nameRequired'));
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.createWorker({ name });
      setNewName('');
      setNotice(t('workers.saved'));
      await loadWorkers(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setSaving(false);
    }
  }

  function startEditing(worker: Worker) {
    setEditingId(worker.id);
    setEditingName(worker.name);
    setError('');
    setNotice('');
  }

  async function saveWorker(worker: Worker) {
    const name = editingName.trim();

    if (!name) {
      setError(t('workers.nameRequired'));
      return;
    }

    setWorkingId(worker.id);
    setError('');
    setNotice('');

    try {
      await api.updateWorker(worker.id, { name });
      setEditingId(null);
      setEditingName('');
      setNotice(t('workers.updated'));
      await loadWorkers(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  async function setWorkerActive(worker: Worker, isActive: boolean) {
    setWorkingId(worker.id);
    setError('');
    setNotice('');

    try {
      if (isActive) {
        await api.updateWorker(worker.id, { isActive: true });
        setNotice(t('workers.reactivated'));
      } else {
        await api.deactivateWorker(worker.id);
        setNotice(t('workers.deactivated'));
      }

      await loadWorkers(false);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  const activeWorkers = workers.filter((worker) => worker.isActive);
  const inactiveWorkers = workers.filter((worker) => !worker.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle={t('workers.subtitle')}
      title={t('workers.title')}
    >
      <DashboardCard>
        <DashboardField
          label={t('workers.name')}
          onChangeText={setNewName}
          placeholder="Ana"
          value={newName}
        />
        <DashboardButton
          disabled={saving}
          label={saving ? t('common.saving') : t('workers.add')}
          onPress={addWorker}
        />
      </DashboardCard>

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : workers.length === 0 ? (
        <DashboardNotice message={t('workers.empty')} />
      ) : (
        <View style={styles.list}>
          {activeWorkers.map((worker) => (
            <WorkerCard
              editingId={editingId}
              editingName={editingName}
              key={worker.id}
              onCancelEditing={() => setEditingId(null)}
              onDeactivate={() => setWorkerActive(worker, false)}
              onEdit={() => startEditing(worker)}
              onSave={() => saveWorker(worker)}
              onSetEditingName={setEditingName}
              worker={worker}
              working={workingId === worker.id}
            />
          ))}

          {inactiveWorkers.length > 0 ? (
            <Text style={styles.sectionLabel}>{t('workers.inactiveSection')}</Text>
          ) : null}

          {inactiveWorkers.map((worker) => (
            <WorkerCard
              editingId={editingId}
              editingName={editingName}
              key={worker.id}
              onCancelEditing={() => setEditingId(null)}
              onDeactivate={() => setWorkerActive(worker, false)}
              onEdit={() => startEditing(worker)}
              onReactivate={() => setWorkerActive(worker, true)}
              onSave={() => saveWorker(worker)}
              onSetEditingName={setEditingName}
              worker={worker}
              working={workingId === worker.id}
            />
          ))}
        </View>
      )}
    </DashboardLayout>
  );
}

type WorkerCardProps = {
  worker: Worker;
  editingId: string | null;
  editingName: string;
  working: boolean;
  onSetEditingName: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEditing: () => void;
  onDeactivate: () => void;
  onReactivate?: () => void;
};

function WorkerCard({
  worker,
  editingId,
  editingName,
  working,
  onSetEditingName,
  onEdit,
  onSave,
  onCancelEditing,
  onDeactivate,
  onReactivate,
}: WorkerCardProps) {
  const { t } = useI18n();
  const isEditing = editingId === worker.id;

  return (
    <DashboardCard>
      {isEditing ? (
        <DashboardField
          label={t('workers.workerName')}
          onChangeText={onSetEditingName}
          value={editingName}
        />
      ) : (
        <View style={styles.cardHeader}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={[styles.status, !worker.isActive ? styles.inactive : null]}>
            {worker.isActive ? t('common.active') : t('common.inactive')}
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
            {worker.isActive ? (
              <DashboardButton
                disabled={working}
                label={working ? t('common.saving') : t('workers.deactivate')}
                onPress={onDeactivate}
                variant="danger"
              />
            ) : (
              <DashboardButton
                disabled={working}
                label={working ? t('common.saving') : t('workers.reactivate')}
                onPress={onReactivate}
              />
            )}
          </>
        )}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  workerName: {
    color: dashboardColors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
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
