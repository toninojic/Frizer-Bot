import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme/theme';

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
  secureTextEntry?: boolean;
};

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
  secureTextEntry,
}: FormInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.mutedText}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline ? styles.multiline : null]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: theme.spacing[2],
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
    minHeight: 48,
    paddingHorizontal: theme.spacing[4],
  },
  multiline: {
    minHeight: 96,
    paddingTop: theme.spacing[3],
    textAlignVertical: 'top',
  },
});
