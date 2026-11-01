import React, { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MaxFontScale, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Labelled text input with a clear focus state. Font size 16 avoids iOS Safari zoom on web;
 * minWidth 0 keeps rows from overflowing; the web outline is replaced by the border focus state.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, style, onFocus, onBlur, ...rest },
  ref
) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="secondary" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.tint}
        cursorColor={colors.tint}
        accessibilityLabel={label}
        maxFontSizeMultiplier={MaxFontScale}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          rest.multiline ? styles.multiline : null,
          rest.editable === false ? styles.readOnly : null,
          style,
        ]}
      />
      {error ? (
        <View style={styles.helperRow} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={15} color={colors.danger} style={styles.helperIcon} />
          <AppText variant="caption" tone="error" style={styles.flex}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrap: {
      marginBottom: Spacing.medium,
      minWidth: 0,
    },
    label: {
      marginBottom: Spacing.small - 2,
    },
    input: {
      minHeight: TouchTarget + 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: Radii.md,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.medium,
      paddingVertical: Spacing.small,
      fontSize: 16,
      color: colors.text,
      minWidth: 0,
      ...Platform.select({ web: { outlineStyle: 'none' } as object, default: {} }),
    },
    inputFocused: {
      borderColor: colors.tint,
    },
    inputError: {
      borderColor: colors.danger,
    },
    readOnly: {
      backgroundColor: colors.surfaceMuted,
      color: colors.textSecondary,
    },
    multiline: {
      minHeight: 104,
      paddingTop: Spacing.small + 4,
      textAlignVertical: 'top',
    },
    helper: {
      marginTop: Spacing.xs,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: Spacing.xs,
    },
    helperIcon: {
      marginTop: 1,
      marginRight: Spacing.xs,
    },
    flex: {
      flex: 1,
    },
  });
