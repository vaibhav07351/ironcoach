import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, Type } from '@/constants/theme';

export type TextVariant = keyof typeof Type;
export type TextTone = 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'onPrimary' | 'brand';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  center?: boolean;
};

const toneColor: Record<TextTone, string> = {
  primary: Colors.textPrimary,
  secondary: Colors.textSecondary,
  muted: Colors.textMuted,
  error: Colors.error,
  success: Colors.success,
  onPrimary: Colors.textOnPrimary,
  brand: Colors.primary,
};

/** Text with the app's type scale and colour roles. */
export function AppText({ variant = 'body', tone = 'primary', center, style, ...rest }: Props): React.JSX.Element {
  return (
    <Text
      {...rest}
      style={[
        Type[variant],
        variant === 'title' ? styles.display : null,
        { color: toneColor[tone] },
        center ? styles.center : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: Fonts.display,
  },
  center: {
    textAlign: 'center',
  },
});
