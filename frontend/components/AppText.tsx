import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { MaxFontScale, type Palette, type TypeVariant } from '@/constants/theme';
import { useTheme } from '../app/contexts/ThemeContext';

export type TextVariant = TypeVariant;
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'error'
  | 'success'
  | 'warning'
  | 'brand'
  | 'onBrand'
  | 'onBrandMuted'
  | 'onAccent';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
};

const toneKey: Record<TextTone, keyof Palette> = {
  primary: 'text',
  secondary: 'textSecondary',
  muted: 'textMuted',
  error: 'danger',
  success: 'success',
  warning: 'warning',
  brand: 'tint',
  onBrand: 'onBrand',
  onBrandMuted: 'onBrandMuted',
  onAccent: 'onAccent',
};

/** Text with the app's type scale and colour roles. Honours the phone's text size, up to a cap. */
export function AppText({ variant = 'body', tone = 'primary', center, style, ...rest }: Props): React.JSX.Element {
  const { type, colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MaxFontScale}
      {...rest}
      style={[type[variant], { color: colors[toneKey[tone]] }, center ? styles.center : null, style]}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
});
