import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

type AppScreenProps = {
  children: ReactNode;
  backgroundColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  scroll?: boolean;
};

export function AppScreen({
  backgroundColor = theme.colors.background,
  children,
  contentContainerStyle,
  keyboardAvoiding = true,
  scroll = true,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const safeAreaStyle = [
    styles.safeArea,
    {
      backgroundColor,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingTop: insets.top,
    },
  ];
  const contentStyle = [
    styles.content,
    contentContainerStyle,
    {
      paddingBottom: theme.spacing[8] + insets.bottom,
    },
  ];

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fixedContent, ...contentStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={keyboardAvoiding}
      style={[styles.keyboard, { backgroundColor }]}
    >
      <View style={safeAreaStyle}>{body}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: theme.spacing[5],
    padding: theme.spacing[5],
  },
  fixedContent: {
    flex: 1,
  },
});
