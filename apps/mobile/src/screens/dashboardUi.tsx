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
        placeholderTextColor="#98a2b3"
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
  border: '#e4e7ec',
  ink: '#101828',
  muted: '#667085',
  primary: '#135e4b',
  surface: '#ffffff',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f4',
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 32,
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
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#135e4b',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#98a2b3',
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: '#b42318',
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#344054',
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  notice: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
  },
  errorNotice: {
    color: '#b42318',
  },
  successNotice: {
    color: '#027a48',
  },
});
