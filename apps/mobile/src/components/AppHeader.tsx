import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { theme } from '../theme/theme';
import { StatusBadge } from './StatusBadge';

type AppHeaderProps = {
  salonName: string;
  userEmail: string;
  aiEnabled: boolean;
};

export function AppHeader({ salonName, userEmail, aiEnabled }: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{salonName}</Text>
        <Text style={styles.email}>{userEmail}</Text>
      </View>
      <StatusBadge
        label={aiEnabled ? t('ai.active') : t('ai.paused')}
        tone={aiEnabled ? 'success' : 'danger'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: theme.spacing[3],
    justifyContent: 'space-between',
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.screenTitle,
    fontWeight: '800',
    letterSpacing: 0,
  },
  email: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
});
