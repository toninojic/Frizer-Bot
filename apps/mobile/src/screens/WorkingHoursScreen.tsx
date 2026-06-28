import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, DayOfWeek, WorkingHour } from '../api/client';
import {
  DashboardButton,
  DashboardCard,
  DashboardField,
  DashboardLayout,
  DashboardNotice,
  dashboardColors,
} from './dashboardUi';
import { useI18n } from '../i18n';

type WorkingHoursScreenProps = {
  api: ApiClient;
  onBack: () => void;
};

const days: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function WorkingHoursScreen({
  api,
  onBack,
}: WorkingHoursScreenProps) {
  const { dayLabel, mapError, t } = useI18n();
  const [hours, setHours] = useState<WorkingHour[]>(defaultHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadHours() {
    setLoading(true);
    setError('');

    try {
      setHours(mergeHours(await api.workingHours()));
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHours();
  }, [api]);

  function updateDay(dayOfWeek: DayOfWeek, patch: Partial<WorkingHour>) {
    setHours((currentHours) =>
      currentHours.map((workingHour) =>
        workingHour.dayOfWeek === dayOfWeek
          ? { ...workingHour, ...patch }
          : workingHour,
      ),
    );
    setError('');
    setNotice('');
  }

  function toggleClosed(workingHour: WorkingHour) {
    if (workingHour.isClosed) {
      updateDay(workingHour.dayOfWeek, {
        isClosed: false,
        opensAt: workingHour.opensAt ?? '09:00',
        closesAt: workingHour.closesAt ?? '18:00',
      });
      return;
    }

    updateDay(workingHour.dayOfWeek, {
      isClosed: true,
      opensAt: null,
      closesAt: null,
    });
  }

  async function saveHours() {
    const validationError = validateHours(hours, dayLabel, t);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    try {
      setHours(mergeHours(await api.replaceWorkingHours(hours)));
      setNotice(t('workingHours.saved'));
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      onBack={onBack}
      subtitle={t('workingHours.subtitle')}
      title={t('workingHours.title')}
    >
      {error ? <DashboardNotice message={error} tone="error" /> : null}
      {notice ? <DashboardNotice message={notice} tone="success" /> : null}

      {loading ? (
        <ActivityIndicator color={dashboardColors.primary} />
      ) : (
        <>
          <View style={styles.list}>
            {hours.map((workingHour) => (
              <DashboardCard key={workingHour.dayOfWeek}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>
                    {dayLabel(workingHour.dayOfWeek)}
                  </Text>
                  <DashboardButton
                    label={workingHour.isClosed ? t('common.closed') : t('common.open')}
                    onPress={() => toggleClosed(workingHour)}
                    variant={workingHour.isClosed ? 'secondary' : 'primary'}
                  />
                </View>

                {workingHour.isClosed ? (
                  <Text style={styles.closedText}>{t('common.closedAllDay')}</Text>
                ) : (
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <DashboardField
                        label={t('workingHours.opens')}
                        onChangeText={(opensAt) =>
                          updateDay(workingHour.dayOfWeek, { opensAt })
                        }
                        placeholder="09:00"
                        value={workingHour.opensAt ?? ''}
                      />
                    </View>
                    <View style={styles.timeField}>
                      <DashboardField
                        label={t('workingHours.closes')}
                        onChangeText={(closesAt) =>
                          updateDay(workingHour.dayOfWeek, { closesAt })
                        }
                        placeholder="18:00"
                        value={workingHour.closesAt ?? ''}
                      />
                    </View>
                  </View>
                )}
              </DashboardCard>
            ))}
          </View>

          <DashboardButton
            disabled={saving}
            label={saving ? t('common.saving') : t('workingHours.saveAll')}
            onPress={saveHours}
          />
        </>
      )}
    </DashboardLayout>
  );
}

function defaultHours() {
  return days.map((dayOfWeek) => ({
    dayOfWeek,
    opensAt: dayOfWeek === 'SUNDAY' ? null : '09:00',
    closesAt: dayOfWeek === 'SUNDAY' ? null : '18:00',
    isClosed: dayOfWeek === 'SUNDAY',
  }));
}

function mergeHours(apiHours: WorkingHour[]) {
  const byDay = new Map(apiHours.map((workingHour) => [
    workingHour.dayOfWeek,
    workingHour,
  ]));

  return defaultHours().map((workingHour) => ({
    ...workingHour,
    ...byDay.get(workingHour.dayOfWeek),
  }));
}

function validateHours(
  hours: WorkingHour[],
  dayLabel: (dayOfWeek: DayOfWeek) => string,
  t: ReturnType<typeof useI18n>['t'],
) {
  for (const workingHour of hours) {
    if (workingHour.isClosed) {
      continue;
    }

    if (!workingHour.opensAt || !workingHour.closesAt) {
      return t('workingHours.needsTimes', {
        day: dayLabel(workingHour.dayOfWeek),
      });
    }

    if (
      !timePattern.test(workingHour.opensAt) ||
      !timePattern.test(workingHour.closesAt)
    ) {
      return t('workingHours.mustUseFormat', {
        day: dayLabel(workingHour.dayOfWeek),
      });
    }

    if (workingHour.closesAt <= workingHour.opensAt) {
      return t('workingHours.closeAfterOpen', {
        day: dayLabel(workingHour.dayOfWeek),
      });
    }
  }

  return '';
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  dayTitle: {
    color: dashboardColors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  closedText: {
    color: dashboardColors.muted,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeField: {
    flex: 1,
  },
});
