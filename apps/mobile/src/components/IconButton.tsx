import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

type IconButtonProps = {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  onPress?: () => void;
  disabled?: boolean;
  label: string;
};

export function IconButton({
  icon: Icon,
  onPress,
  disabled,
  label,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled ? styles.disabled : null]}
    >
      <Icon color={theme.colors.text} size={20} strokeWidth={2.3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabled: {
    opacity: 0.45,
  },
});
