import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type QuickActionCardProps = {
  title: string;
  subtitle?: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress?: () => void;
};

export function QuickActionCard({
  title,
  subtitle,
  icon: Icon,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon color={theme.colors.primary} size={21} strokeWidth={2.4} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing[2],
    minHeight: 118,
    minWidth: '30%',
    padding: theme.spacing[4],
    ...theme.shadow,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    lineHeight: 18,
  },
});
