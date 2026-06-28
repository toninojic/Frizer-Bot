import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Briefcase, CalendarClock, Clock, Scissors, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApiClient, AuthUser, SalonFeature, SalonSettings } from '../api/client';
import { AppHeader } from '../components/AppHeader';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';

type SettingsScreenProps = {
  api: ApiClient;
  salon: SalonSettings;
  user: AuthUser;
  onLogout: () => void;
  onSalonUpdated: (salon: SalonSettings) => void;
  onOpenWorkers: () => void;
  onOpenServices: () => void;
  onOpenWorkingHours: () => void;
  onOpenTimeBlocks: () => void;
};

export function SettingsScreen({
  api,
  salon,
  user,
  onLogout,
  onSalonUpdated,
  onOpenWorkers,
  onOpenServices,
  onOpenWorkingHours,
  onOpenTimeBlocks,
}: SettingsScreenProps) {
  const { featureLabel, language, mapError, setLanguage, t } = useI18n();
  const [features, setFeatures] = useState<SalonFeature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadFeatures() {
      setFeaturesLoading(true);
      setFeaturesError('');

      try {
        const salonFeatures = await api.dashboardFeatures();

        if (active) {
          setFeatures(salonFeatures);
        }
      } catch (loadError) {
        if (active) {
          setFeaturesError(mapError(loadError));
        }
      } finally {
        if (active) {
          setFeaturesLoading(false);
        }
      }
    }

    loadFeatures();

    return () => {
      active = false;
    };
  }, [api, mapError]);

  async function updateSettings(patch: Partial<SalonSettings>) {
    setSaving(true);
    setError('');

    try {
      onSalonUpdated(await api.updateSalonSettings(patch));
    } catch (updateError) {
      setError(mapError(updateError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <AppHeader
        aiEnabled={salon.receptionistEnabled}
        salonName={salon.name}
        userEmail={user.email}
      />

      <View style={styles.titleBlock}>
        <Text style={styles.screenTitle}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <SectionHeader title={t('settings.salon')} />
        <Card>
          <DetailRow label={t('settings.name')} value={salon.name} />
          <DetailRow label={t('settings.phone')} value={salon.phone} />
          <DetailRow label={t('settings.timezone')} value={salon.timezone} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.aiReceptionist')} />
        <Card>
          <ToggleRow
            disabled={saving}
            label={t('settings.aiEnabled')}
            onValueChange={(value) =>
              updateSettings({ receptionistEnabled: value })
            }
            value={salon.receptionistEnabled}
          />
          <DetailRow
            label={t('settings.receptionistName')}
            value={salon.receptionistName ?? t('common.notSet')}
          />
          <DetailRow
            label={t('settings.welcomeMessage')}
            value={salon.welcomeMessage ?? t('common.notSet')}
          />
          <DetailRow label={t('settings.transferPhone')} value={salon.transferPhone ?? '-'} />
          <ToggleRow
            disabled={saving}
            label={t('settings.smsConfirmations')}
            onValueChange={(value) =>
              updateSettings({ smsConfirmationsEnabled: value })
            }
            value={salon.smsConfirmationsEnabled}
          />
          <DetailRow
            label={t('settings.reminder')}
            value={t('settings.hoursBefore', {
              hours: salon.reminderHoursBefore,
            })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.operations')} />
        <Card>
          <SettingsLink
            icon={Users}
            onPress={onOpenWorkers}
            subtitle={t('settings.workersSubtitle')}
            title={t('workers.title')}
          />
          <SettingsLink
            icon={Scissors}
            onPress={onOpenServices}
            subtitle={t('settings.servicesSubtitle')}
            title={t('services.title')}
          />
          <SettingsLink
            icon={Clock}
            onPress={onOpenWorkingHours}
            subtitle={t('settings.workingHoursSubtitle')}
            title={t('workingHours.title')}
          />
          <SettingsLink
            icon={CalendarClock}
            onPress={onOpenTimeBlocks}
            subtitle={t('settings.timeBlocksSubtitle')}
            title={t('timeBlocks.title')}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.activeModules')} />
        <Card>
          {featuresLoading ? (
            <Text style={styles.detailLabel}>{t('settings.modulesLoading')}</Text>
          ) : featuresError ? (
            <Text style={styles.error}>{featuresError}</Text>
          ) : (
            features.map((feature) => (
              <ModuleRow
                enabled={feature.enabled}
                key={feature.featureKey}
                label={featureLabel(feature.featureKey)}
                statusDisabled={t('feature.disabled')}
                statusEnabled={t('feature.enabled')}
              />
            ))
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.languageTitle')} />
        <View style={styles.languageRow}>
          <LanguageOption
            active={language === 'sr'}
            label={t('settings.languageSr')}
            onPress={() => setLanguage('sr')}
          />
          <LanguageOption
            active={language === 'en'}
            label={t('settings.languageEn')}
            onPress={() => setLanguage('en')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('settings.account')} />
        <Button icon={Briefcase} label={t('settings.logout')} onPress={onLogout} variant="secondary" />
      </View>
    </AppScreen>
  );
}

function LanguageOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.languageOption, active ? styles.languageOptionActive : null]}
    >
      <Text
        style={[
          styles.languageText,
          active ? styles.languageTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
      <Text style={styles.detailValue}>{label}</Text>
      <ToggleSwitch
        disabled={disabled}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function ModuleRow({
  label,
  enabled,
  statusEnabled,
  statusDisabled,
}: {
  label: string;
  enabled: boolean;
  statusEnabled: string;
  statusDisabled: string;
}) {
  return (
    <View style={styles.moduleRow}>
      <Text style={styles.detailValue}>{label}</Text>
      <StatusBadge
        label={enabled ? statusEnabled : statusDisabled}
        tone={enabled ? 'success' : 'danger'}
      />
    </View>
  );
}

function SettingsLink({
  title,
  subtitle,
  icon: Icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <View style={styles.iconWrap}>
        <Icon color={theme.colors.primary} size={20} strokeWidth={2.4} />
      </View>
      <View style={styles.linkText}>
        <Text style={styles.detailValue}>{title}</Text>
        <Text style={styles.detailLabel}>{subtitle}</Text>
      </View>
    </Pressable>
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
  section: {
    gap: theme.spacing[3],
  },
  detailRow: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: theme.spacing[3],
  },
  detailLabel: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    justifyContent: 'space-between',
    paddingBottom: theme.spacing[3],
  },
  linkRow: {
    alignItems: 'center',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  linkText: {
    flex: 1,
    gap: 3,
  },
  error: {
    color: '#B42318',
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  languageRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  languageOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[3],
  },
  languageOptionActive: {
    backgroundColor: '#F0F2FF',
    borderColor: theme.colors.primarySoft,
  },
  languageText: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  languageTextActive: {
    color: theme.colors.primary,
  },
});
