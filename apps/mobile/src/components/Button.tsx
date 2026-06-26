import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme/theme';

type IconComponent = ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconComponent;
};

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon: Icon,
}: ButtonProps) {
  const isSecondary = variant === 'secondary' || variant === 'ghost';
  const iconColor = isSecondary ? theme.colors.text : theme.colors.card;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        styles[variant],
        disabled ? styles.disabled : null,
      ]}
    >
      {Icon ? <Icon color={iconColor} size={18} strokeWidth={2.3} /> : null}
      <Text style={[styles.text, isSecondary ? styles.secondaryText : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: theme.radius.medium,
    flexDirection: 'row',
    gap: theme.spacing[2],
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: theme.spacing[4],
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: theme.colors.card,
    fontSize: theme.typography.body,
    fontWeight: '800',
  },
  secondaryText: {
    color: theme.colors.text,
  },
});
