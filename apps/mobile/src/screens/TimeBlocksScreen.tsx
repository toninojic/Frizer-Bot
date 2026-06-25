import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, TimeBlock, Worker } from '../api/client';
import {
  DashboardButton,
  DashboardCard,
  DashboardField,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';

type TimeBlocksScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

type TimeBlockForm = {
  title: string;
  workerId: string;
  date: string;
  startTime: string;
  endTime: string;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function TimeBlocksScreen({ api, onBack }: TimeBlocksScreenProps) {
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState<TimeBlockForm>(defaultForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadData(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
    }

    setError('');

    try {
      const [blocksResponse, workersResponse] = await Promise.all([
        api.timeBlocks(),
        api.workers(),
      ]);
      setTimeBlocks(blocksResponse);
      setWorkers(workersResponse);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [api]);

  async function addTimeBlock() {
    const payload = timeBlockPayload(form);

    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await api.createTimeBlock(payload);
      setForm(defaultForm());
      setNotice('Time block saved');
      await loadData(false);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTimeBlock(timeBlock: TimeBlock) {
    setDeletingId(timeBlock.id);
    setError('');
    setNotice('');

    try {
      await api.deleteTimeBlock(timeBlock.id);
      setNotice('Time block deleted');
      await loadData(false);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  const activeWorkers = workers.filter((worker) => worker.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle="Block unavailable salon or worker time."
      title="Blocked Time"
    >
      <DashboardCard>
        <DashboardField
          label="Title"
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="Ana pause"
          value={form.title}
        />

        <Text style={styles.label}>Applies to</Text>
        <View style={styles.choiceRow}>
          <DashboardButton
            label="Whole salon"
            onPress={() => setForm({ ...form, workerId: '' })}
            variant={form.workerId === '' ? 'primary' : 'secondary'}
          />
          {activeWorkers.map((worker) => (
            <DashboardButton
              key={worker.id}
              label={worker.name}
              onPress={() => setForm({ ...form, workerId: worker.id })}
              variant={form.workerId === worker.id ? 'primary' : 'secondary'}
            />
          ))}
        </View>

        <DashboardField
          label="Date"
          onChangeText={(date) => setForm({ ...form, date })}
          placeholder="2026-06-25"
          value={form.date}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <DashboardField
              label="Start"
              onChangeText={(startTime) => setForm({ ...form, startTime })}
              placeholder="13:00"
              value={form.startTime}
            />
          </View>
          <View style={styles.timeField}>
            <DashboardField
              label="End"
              onChangeText={(endTime) => setForm({ ...form, endTime })}
              placeholder="13:30"
              value={form.endTime}
            />
          </View>
        </View>

        <DashboardButton
          disabled={saving}
          label={saving ? 'Saving...' : 'Add time block'}
          onPress={addTimeBlock}
        />
      </DashboardCard>

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : timeBlocks.length === 0 ? (
        <DashboardNotice message="No upcoming time blocks" />
      ) : (
        <View style={styles.list}>
          {timeBlocks.map((timeBlock) => (
            <DashboardCard key={timeBlock.id}>
              <View style={styles.blockHeader}>
                <View style={styles.blockText}>
                  <Text style={styles.blockTitle}>{timeBlock.title}</Text>
                  <Text style={styles.blockMeta}>
                    {timeBlock.workerName ?? 'Whole salon'}
                  </Text>
                  <Text style={styles.blockMeta}>
                    {formatRange(timeBlock.startAt, timeBlock.endAt)}
                  </Text>
                </View>
              </View>

              <DashboardButton
                disabled={deletingId === timeBlock.id}
                label={deletingId === timeBlock.id ? 'Deleting...' : 'Delete'}
                onPress={() => deleteTimeBlock(timeBlock)}
                variant="danger"
              />
            </DashboardCard>
          ))}
        </View>
      )}
    </DashboardLayout>
  );
}

function defaultForm(): TimeBlockForm {
  return {
    title: '',
    workerId: '',
    date: formatDateInput(new Date()),
    startTime: '13:00',
    endTime: '13:30',
  };
}

function timeBlockPayload(form: TimeBlockForm):
  | {
      title: string;
      workerId: string | null;
      startAt: string;
      endAt: string;
    }
  | { error: string } {
  const title = form.title.trim();

  if (!title) {
    return { error: 'Title is required' };
  }

  if (!datePattern.test(form.date)) {
    return { error: 'Date must use YYYY-MM-DD format' };
  }

  if (!timePattern.test(form.startTime) || !timePattern.test(form.endTime)) {
    return { error: 'Start and end must use HH:mm time' };
  }

  const startAt = new Date(`${form.date}T${form.startTime}:00`);
  const endAt = new Date(`${form.date}T${form.endTime}:00`);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: 'Date and time must be valid' };
  }

  if (endAt <= startAt) {
    return { error: 'End time must be after start time' };
  }

  return {
    title,
    workerId: form.workerId || null,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  };
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${start.toLocaleDateString()} ${formatTime(start)}-${formatTime(end)}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  label: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
  },
  list: {
    gap: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  blockText: {
    flex: 1,
    gap: 4,
  },
  blockTitle: {
    color: dashboardColors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  blockMeta: {
    color: dashboardColors.muted,
    fontSize: 14,
  },
});
