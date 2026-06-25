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

type WorkersScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

export function WorkersScreen({ api, onBack }: WorkersScreenProps) {
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
      setError(errorMessage(loadError));
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
      setError('Worker name is required');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.createWorker({ name });
      setNewName('');
      setNotice('Worker saved');
      await loadWorkers(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
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
      setError('Worker name is required');
      return;
    }

    setWorkingId(worker.id);
    setError('');
    setNotice('');

    try {
      await api.updateWorker(worker.id, { name });
      setEditingId(null);
      setEditingName('');
      setNotice('Worker updated');
      await loadWorkers(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
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
        setNotice('Worker reactivated');
      } else {
        await api.deactivateWorker(worker.id);
        setNotice('Worker deactivated');
      }

      await loadWorkers(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setWorkingId(null);
    }
  }

  const activeWorkers = workers.filter((worker) => worker.isActive);
  const inactiveWorkers = workers.filter((worker) => !worker.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle="Manage staff who can take appointments."
      title="Workers"
    >
      <DashboardCard>
        <DashboardField
          label="Name"
          onChangeText={setNewName}
          placeholder="Ana"
          value={newName}
        />
        <DashboardButton
          disabled={saving}
          label={saving ? 'Saving...' : 'Add worker'}
          onPress={addWorker}
        />
      </DashboardCard>

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : workers.length === 0 ? (
        <DashboardNotice message="No workers yet" />
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
            <Text style={styles.sectionLabel}>Inactive</Text>
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
  const isEditing = editingId === worker.id;

  return (
    <DashboardCard>
      {isEditing ? (
        <DashboardField
          label="Worker name"
          onChangeText={onSetEditingName}
          value={editingName}
        />
      ) : (
        <View style={styles.cardHeader}>
          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={[styles.status, !worker.isActive ? styles.inactive : null]}>
            {worker.isActive ? 'Active' : 'Inactive'}
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
            {worker.isActive ? (
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
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
