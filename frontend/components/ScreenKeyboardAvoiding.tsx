import React, { type ReactNode, useContext } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Keyboard-safe layout applied to every stack screen by the navigator.
 * iOS pads by the header height; Android uses windowSoftInputMode=adjustResize (app.config.js),
 * so adding KeyboardAvoidingView behaviour there would double-adjust.
 */
export function ScreenKeyboardAvoiding({ children, style }: Props): React.JSX.Element {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(headerHeight, 12) : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
