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
import { useI18n } from '../i18n';

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
  const { formatDate, formatTime, mapError, t } = useI18n();
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
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [api]);

  async function addTimeBlock() {
    const payload = timeBlockPayload(form, t);

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
      setNotice(t('timeBlocks.saved'));
      await loadData(false);
    } catch (saveError) {
      setError(mapError(saveError));
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
      setNotice(t('timeBlocks.deleted'));
      await loadData(false);
    } catch (deleteError) {
      setError(mapError(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  const activeWorkers = workers.filter((worker) => worker.isActive);

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle={t('timeBlocks.subtitle')}
      title={t('timeBlocks.title')}
    >
      <DashboardCard>
        <DashboardField
          label={t('timeBlocks.formTitle')}
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="Ana pause"
          value={form.title}
        />

        <Text style={styles.label}>{t('timeBlocks.appliesTo')}</Text>
        <View style={styles.choiceRow}>
          <DashboardButton
            label={t('common.wholeSalon')}
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
          label={t('timeBlocks.date')}
          onChangeText={(date) => setForm({ ...form, date })}
          placeholder="2026-06-25"
          value={form.date}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <DashboardField
              label={t('timeBlocks.start')}
              onChangeText={(startTime) => setForm({ ...form, startTime })}
              placeholder="13:00"
              value={form.startTime}
            />
          </View>
          <View style={styles.timeField}>
            <DashboardField
              label={t('timeBlocks.end')}
              onChangeText={(endTime) => setForm({ ...form, endTime })}
              placeholder="13:30"
              value={form.endTime}
            />
          </View>
        </View>

        <DashboardButton
          disabled={saving}
          label={saving ? t('common.saving') : t('timeBlocks.add')}
          onPress={addTimeBlock}
        />
      </DashboardCard>

      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : timeBlocks.length === 0 ? (
        <DashboardNotice message={t('timeBlocks.empty')} />
      ) : (
        <View style={styles.list}>
          {timeBlocks.map((timeBlock) => (
            <DashboardCard key={timeBlock.id}>
              <View style={styles.blockHeader}>
                <View style={styles.blockText}>
                  <Text style={styles.blockTitle}>{timeBlock.title}</Text>
                  <Text style={styles.blockMeta}>
                    {timeBlock.workerName ?? t('common.wholeSalon')}
                  </Text>
                  <Text style={styles.blockMeta}>
                    {formatRange(timeBlock.startAt, timeBlock.endAt, formatDate, formatTime)}
                  </Text>
                </View>
              </View>

              <DashboardButton
                disabled={deletingId === timeBlock.id}
                label={deletingId === timeBlock.id ? t('common.deleting') : t('common.delete')}
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

function timeBlockPayload(
  form: TimeBlockForm,
  t: ReturnType<typeof useI18n>['t'],
):
  | {
      title: string;
      workerId: string | null;
      startAt: string;
      endAt: string;
    }
  | { error: string } {
  const title = form.title.trim();

  if (!title) {
    return { error: t('timeBlocks.titleRequired') };
  }

  if (!datePattern.test(form.date)) {
    return { error: t('common.invalidDate') };
  }

  if (!timePattern.test(form.startTime) || !timePattern.test(form.endTime)) {
    return { error: t('timeBlocks.timeInvalid') };
  }

  const startAt = new Date(`${form.date}T${form.startTime}:00`);
  const endAt = new Date(`${form.date}T${form.endTime}:00`);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: t('timeBlocks.dateTimeInvalid') };
  }

  if (endAt <= startAt) {
    return { error: t('timeBlocks.endAfterStart') };
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

function formatRange(
  startAt: string,
  endAt: string,
  formatDate: (value: string | Date) => string,
  formatTime: (value: string | Date) => string,
) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${formatDate(start)} ${formatTime(start)}-${formatTime(end)}`;
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
