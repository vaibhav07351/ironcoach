import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Labelled text input. Font size 16 avoids iOS Safari zoom on web; minWidth 0 keeps rows from
 * overflowing; the outline is removed on web (the border shows focus state instead).
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, style, ...rest },
  ref
) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={Colors.textMuted}
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, rest.multiline ? styles.multiline : null, style]}
      />
      {error ? (
        <AppText variant="caption" tone="error" style={styles.helper}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.medium,
    minWidth: 0,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    minHeight: TouchTarget,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    fontSize: 16,
    color: Colors.textPrimary,
    minWidth: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
  },
  inputError: {
    borderColor: Colors.error,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  helper: {
    marginTop: Spacing.xs,
  },
});
