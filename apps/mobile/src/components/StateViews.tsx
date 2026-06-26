import type { ComponentType, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';
import { theme } from '../theme/theme';
import { Button } from './Button';

type StateProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  message,
  actionLabel,
  onAction,
}: StateProps) {
  return (
    <StateShell icon={Inbox} title={title} message={message}>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
    </StateShell>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  actionLabel = 'Try again',
  onAction,
}: StateProps) {
  return (
    <StateShell icon={AlertCircle} title={title} message={message}>
      {onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </StateShell>
  );
}

function StateShell({
  icon: Icon,
  title,
  message,
  children,
}: StateProps & {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  children?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.iconWrap}>
        <Icon color={theme.colors.primary} size={22} strokeWidth={2.2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[6],
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.cardTitle,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.body,
    lineHeight: 21,
    textAlign: 'center',
  },
});
