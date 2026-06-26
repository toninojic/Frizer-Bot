import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../theme/theme';

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function ToggleSwitch({
  value,
  onValueChange,
  disabled,
}: ToggleSwitchProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: theme.radius.pill,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 54,
  },
  trackOn: {
    backgroundColor: theme.colors.success,
  },
  trackOff: {
    backgroundColor: theme.colors.border,
  },
  thumb: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.pill,
    height: 26,
    width: 26,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  thumbOff: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.55,
  },
});
