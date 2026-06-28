import { LogOut } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AuthUser } from '../api/client';
import { AppScreen } from '../components/AppScreen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { DetailRow, PlatformHeader, platformStyles } from './platformAdminUi';

type PlatformSettingsScreenProps = {
  user: AuthUser;
  onLogout: () => void;
};

export function PlatformSettingsScreen({
  user,
  onLogout,
}: PlatformSettingsScreenProps) {
  const { language, roleLabel, setLanguage, t } = useI18n();

  return (
    <AppScreen>
      <PlatformHeader user={user} />

      <View style={platformStyles.titleBlock}>
        <Text style={platformStyles.screenTitle}>{t('platform.settings.title')}</Text>
        <Text style={platformStyles.subtitle}>{t('platform.settings.subtitle')}</Text>
      </View>

      <Card>
        <DetailRow label={t('platform.settings.email')} value={user.email} />
        <DetailRow label={t('platform.settings.role')} value={roleLabel(user.role)} />
      </Card>

      <View style={platformStyles.section}>
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

      <Button
        icon={LogOut}
        label={t('settings.logout')}
        onPress={onLogout}
        variant="secondary"
      />
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

const styles = StyleSheet.create({
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
    justifyContent: 'center',
    minHeight: 48,
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
