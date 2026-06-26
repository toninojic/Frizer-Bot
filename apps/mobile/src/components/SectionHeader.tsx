import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme/theme';

type SectionHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sectionTitle,
    fontWeight: '800',
  },
});
