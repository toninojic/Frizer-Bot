import type { ReactNode } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { theme } from '../theme/theme';

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
};

type NoticeProps = {
  message: string;
  tone?: 'error' | 'success' | 'muted';
};

export function DashboardLayout({
  title,
  subtitle,
  onBack,
  children,
}: DashboardLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {onBack ? (
            <DashboardButton label="Back" onPress={onBack} variant="secondary" />
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function DashboardCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function DashboardButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'secondary' ? styles.secondaryButton : null,
        variant === 'danger' ? styles.dangerButton : null,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' ? styles.secondaryButtonText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DashboardField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function DashboardNotice({ message, tone = 'muted' }: NoticeProps) {
  return (
    <Text
      style={[
        styles.notice,
        tone === 'error' ? styles.errorNotice : null,
        tone === 'success' ? styles.successNotice : null,
      ]}
    >
      {message}
    </Text>
  );
}

export const dashboardColors = {
  border: theme.colors.border,
  ink: theme.colors.text,
  muted: theme.colors.mutedText,
  primary: theme.colors.primary,
  surface: theme.colors.card,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    gap: theme.spacing[4],
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[8],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.screenTitle,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    ...theme.shadow,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.medium,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButton: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: theme.colors.card,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: theme.colors.text,
  },
  field: {
    gap: 6,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  input: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  notice: {
    color: theme.colors.mutedText,
    fontSize: theme.typography.small,
    lineHeight: 20,
  },
  errorNotice: {
    color: '#B42318',
  },
  successNotice: {
    color: '#027A48',
  },
});
