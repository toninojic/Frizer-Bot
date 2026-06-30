import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type {
  ApiClient,
  AuthUser,
  FeatureKey,
  PlatformSalonDetails,
  SalonFeature,
} from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { ErrorState, LoadingState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import {
  DetailRow,
  MetricCard,
  PlatformHeader,
  PreviewCard,
  platformStyles,
} from './platformAdminUi';

type PlatformSalonDetailsScreenProps = {
  api: ApiClient;
  user: AuthUser;
  salonId: string;
  onBack: () => void;
};

type SalonDraft = {
  name: string;
  phone: string;
  twilioPhoneNumber: string;
  city: string;
  timezone: string;
  isActive: boolean;
  receptionistName: string;
  receptionistEnabled: boolean;
  transferPhone: string;
  workingAfterHoursEnabled: boolean;
  smsConfirmationsEnabled: boolean;
  reminderHoursBefore: string;
};

export function PlatformSalonDetailsScreen({
  api,
  user,
  salonId,
  onBack,
}: PlatformSalonDetailsScreenProps) {
  const { dayLabel, featureLabel, formatDate, mapError, t } = useI18n();
  const [salon, setSalon] = useState<PlatformSalonDetails | null>(null);
  const [draft, setDraft] = useState<SalonDraft | null>(null);
  const [features, setFeatures] = useState<SalonFeature[]>([]);
  const [savingFeatures, setSavingFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [featureError, setFeatureError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [data, salonFeatures] = await Promise.all([
        api.adminSalon(salonId),
        api.adminSalonFeatures(salonId),
      ]);
      setSalon(data);
      setDraft(toDraft(data));
      setFeatures(salonFeatures);
    } catch (loadError) {
      setError(mapError(loadError));
    } finally {
      setLoading(false);
    }
  }, [api, salonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveChanges() {
    if (!draft) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const reminderHoursBefore = Number.parseInt(
        draft.reminderHoursBefore,
        10,
      );
      const updated = await api.updateAdminSalon(salonId, {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        twilioPhoneNumber: draft.twilioPhoneNumber.trim() || null,
        city: draft.city.trim() || null,
        timezone: draft.timezone.trim(),
        isActive: draft.isActive,
        receptionistName: draft.receptionistName.trim() || null,
        receptionistEnabled: draft.receptionistEnabled,
        transferPhone: draft.transferPhone.trim() || null,
        workingAfterHoursEnabled: draft.workingAfterHoursEnabled,
        smsConfirmationsEnabled: draft.smsConfirmationsEnabled,
        reminderHoursBefore: Number.isFinite(reminderHoursBefore)
          ? reminderHoursBefore
          : 0,
      });

      setSalon(updated);
      setDraft(toDraft(updated));
      setSaved(true);
    } catch (saveError) {
      setError(mapError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function updateFeature(featureKey: FeatureKey, enabled: boolean) {
    const previousFeatures = features;

    setFeatureError('');
    setSavingFeatures((current) => ({ ...current, [featureKey]: true }));
    setFeatures((current) =>
      current.map((feature) =>
        feature.featureKey === featureKey ? { ...feature, enabled } : feature,
      ),
    );

    try {
      const updated = await api.updateAdminSalonFeature(
        salonId,
        featureKey,
        enabled,
      );

      setFeatures((current) =>
        current.map((feature) =>
          feature.featureKey === featureKey ? updated : feature,
        ),
      );
    } catch (updateError) {
      setFeatures(previousFeatures);
      setFeatureError(mapError(updateError));
    } finally {
      setSavingFeatures((current) => ({
        ...current,
        [featureKey]: false,
      }));
    }
  }

  return (
    <AppScreen>
      <PlatformHeader user={user} />

      <Button
        icon={ArrowLeft}
        label={t('common.back')}
        onPress={onBack}
        variant="secondary"
      />

      {loading ? <LoadingState message={t('platform.details.loading')} /> : null}
      {error && !loading ? (
        <ErrorState message={error} onAction={load} />
      ) : null}

      {salon && draft && !loading ? (
        <>
          <View style={platformStyles.titleBlock}>
            <View style={platformStyles.row}>
              <Text style={platformStyles.screenTitle}>{salon.name}</Text>
              <StatusBadge
                label={draft.isActive ? t('common.active') : t('common.inactive')}
                tone={draft.isActive ? 'success' : 'danger'}
              />
            </View>
            <Text style={platformStyles.subtitle}>
              {t('common.created')} {formatDate(salon.createdAt)}
            </Text>
          </View>

          {saved ? <Text style={styles.saved}>{t('common.saved')}</Text> : null}

          <View style={platformStyles.section}>
            <Text style={styles.sectionTitle}>{t('platform.details.general')}</Text>
            <Card>
              <FormInput
                label={t('settings.name')}
                onChangeText={(name) => setDraft({ ...draft, name })}
                value={draft.name}
              />
              <FormInput
                label={t('settings.phone')}
                onChangeText={(phone) => setDraft({ ...draft, phone })}
                value={draft.phone}
              />
              <FormInput
                label={t('platform.details.twilioPhoneNumber')}
                onChangeText={(twilioPhoneNumber) =>
                  setDraft({ ...draft, twilioPhoneNumber })
                }
                value={draft.twilioPhoneNumber}
              />
              <FormInput
                label={t('platform.details.city')}
                onChangeText={(city) => setDraft({ ...draft, city })}
                value={draft.city}
              />
              <FormInput
                label={t('settings.timezone')}
                onChangeText={(timezone) => setDraft({ ...draft, timezone })}
                value={draft.timezone}
              />
              <ToggleRow
                disabled={saving}
                label={t('platform.details.active')}
                onValueChange={(isActive) => setDraft({ ...draft, isActive })}
                value={draft.isActive}
              />
            </Card>
          </View>

          <View style={platformStyles.section}>
            <Text style={styles.sectionTitle}>{t('platform.details.aiReceptionist')}</Text>
            <Card>
              <FormInput
                label={t('settings.receptionistName')}
                onChangeText={(receptionistName) =>
                  setDraft({ ...draft, receptionistName })
                }
                value={draft.receptionistName}
              />
              <ToggleRow
                disabled={saving}
                label={t('platform.details.receptionistEnabled')}
                onValueChange={(receptionistEnabled) =>
                  setDraft({ ...draft, receptionistEnabled })
                }
                value={draft.receptionistEnabled}
              />
              <FormInput
                label={t('settings.transferPhone')}
                onChangeText={(transferPhone) =>
                  setDraft({ ...draft, transferPhone })
                }
                value={draft.transferPhone}
              />
              <ToggleRow
                disabled={saving}
                label={t('platform.details.workingAfterHours')}
                onValueChange={(workingAfterHoursEnabled) =>
                  setDraft({ ...draft, workingAfterHoursEnabled })
                }
                value={draft.workingAfterHoursEnabled}
              />
              <ToggleRow
                disabled={saving}
                label={t('settings.smsConfirmations')}
                onValueChange={(smsConfirmationsEnabled) =>
                  setDraft({ ...draft, smsConfirmationsEnabled })
                }
                value={draft.smsConfirmationsEnabled}
              />
              <FormInput
                keyboardType="number-pad"
                label={t('platform.details.reminderHoursBefore')}
                onChangeText={(reminderHoursBefore) =>
                  setDraft({ ...draft, reminderHoursBefore })
                }
                value={draft.reminderHoursBefore}
              />
            </Card>
          </View>

          <View style={platformStyles.section}>
            <Text style={styles.sectionTitle}>{t('platform.details.features')}</Text>
            <Card>
              {features.map((feature) => (
                <FeatureToggleRow
                  enabled={feature.enabled}
                  key={feature.featureKey}
                  label={featureLabel(feature.featureKey)}
                  onValueChange={(enabled) =>
                    updateFeature(feature.featureKey, enabled)
                  }
                  saving={Boolean(savingFeatures[feature.featureKey])}
                  savingLabel={t('platform.details.featureSaving')}
                />
              ))}
            </Card>
            {featureError ? <Text style={styles.error}>{featureError}</Text> : null}
          </View>

          <Button
            disabled={saving}
            icon={Save}
            label={saving ? t('common.saving') : t('platform.details.saveChanges')}
            onPress={saveChanges}
          />

          <View style={platformStyles.section}>
            <Text style={styles.sectionTitle}>{t('platform.details.usage')}</Text>
            <View style={platformStyles.grid}>
              <MetricCard
                label={t('platform.overview.appointmentsToday')}
                value={salon.usage.appointmentsToday}
              />
              <MetricCard
                label={t('platform.details.appointmentsMonth')}
                value={salon.usage.appointmentsThisMonth}
              />
              <MetricCard label={t('platform.overview.callsToday')} value={salon.usage.callsToday} />
              <MetricCard
                label={t('platform.details.callsMonth')}
                value={salon.usage.callsThisMonth}
              />
              <MetricCard label={t('platform.details.smsMonth')} value={salon.usage.smsThisMonth} />
            </View>
          </View>

          <PreviewCard title={t('platform.details.workers')}>
            {salon.workers.length ? (
              salon.workers.slice(0, 4).map((worker) => (
                <DetailRow
                  key={worker.id}
                  label={worker.isActive ? t('common.active') : t('common.inactive')}
                  value={worker.name}
                />
              ))
            ) : (
              <Text style={styles.empty}>{t('platform.details.noWorkers')}</Text>
            )}
          </PreviewCard>

          <PreviewCard title={t('platform.details.services')}>
            {salon.services.length ? (
              salon.services.slice(0, 4).map((service) => (
                <DetailRow
                  key={service.id}
                  label={`${service.durationMinutes} min`}
                  value={service.name}
                />
              ))
            ) : (
              <Text style={styles.empty}>{t('platform.details.noServices')}</Text>
            )}
          </PreviewCard>

          <PreviewCard title={t('platform.details.workingHours')}>
            {salon.workingHours.map((workingHour) => (
              <DetailRow
                key={workingHour.dayOfWeek}
                label={dayLabel(workingHour.dayOfWeek)}
                value={formatWorkingHour(workingHour, t)}
              />
            ))}
          </PreviewCard>
        </>
      ) : null}
    </AppScreen>
  );
}

function toDraft(salon: PlatformSalonDetails): SalonDraft {
  return {
    name: salon.name,
    phone: salon.phone,
    twilioPhoneNumber: salon.twilioPhoneNumber ?? '',
    city: salon.city ?? '',
    timezone: salon.timezone,
    isActive: salon.isActive,
    receptionistName: salon.receptionistName ?? '',
    receptionistEnabled: salon.receptionistEnabled,
    transferPhone: salon.transferPhone ?? '',
    workingAfterHoursEnabled: salon.workingAfterHoursEnabled,
    smsConfirmationsEnabled: salon.smsConfirmationsEnabled,
    reminderHoursBefore: String(salon.reminderHoursBefore),
  };
}

function FeatureToggleRow({
  label,
  enabled,
  saving,
  savingLabel,
  onValueChange,
}: {
  label: string;
  enabled: boolean;
  saving: boolean;
  savingLabel: string;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {saving ? <Text style={styles.featureSaving}>{savingLabel}</Text> : null}
      </View>
      <ToggleSwitch
        disabled={saving}
        onValueChange={onValueChange}
        value={enabled}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <ToggleSwitch
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function formatWorkingHour(
  workingHour: PlatformSalonDetails['workingHours'][number],
  t: ReturnType<typeof useI18n>['t'],
) {
  if (workingHour.isClosed) {
    return t('common.closed');
  }

  return `${workingHour.opensAt ?? '--:--'}-${workingHour.closesAt ?? '--:--'}`;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '900',
  },
  saved: {
    color: '#027A48',
    fontSize: theme.typography.body,
    fontWeight: '900',
  },
  error: {
    color: '#B42318',
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  featureRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    justifyContent: 'space-between',
    paddingBottom: theme.spacing[3],
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureSaving: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  empty: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
  },
});
