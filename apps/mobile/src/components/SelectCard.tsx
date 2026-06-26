import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { theme } from '../theme/theme';

type SelectCardProps = {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress?: () => void;
  right?: ReactNode;
};

export function SelectCard({
  title,
  subtitle,
  selected,
  onPress,
  right,
}: SelectCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, selected ? styles.selected : null]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {selected ? (
        <View style={styles.check}>
          <Check color={theme.colors.card} size={15} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing[3],
    minHeight: 64,
    padding: theme.spacing[4],
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F5F6FF',
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
  },
  check: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
});
