import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props = {
  value: string | number;
  label: string;
  /** 'hero' sits on a HeroHeader; 'surface' on a normal card. */
  on?: 'hero' | 'surface';
  /** Draws the value in the alert color (e.g. clients slipping). */
  alert?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
};

/** One number with its label. Tappable when it leads somewhere. */
export function StatTile({ value, label, on = 'surface', alert = false, onPress, accessibilityHint }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const hero = on === 'hero';
  const valueColor = alert ? (hero ? colors.onBrandAccent : colors.danger) : hero ? colors.onBrand : colors.text;
  const body = (
    <>
      <AppText variant="number" style={{ color: valueColor }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" tone={hero ? 'onBrandMuted' : 'secondary'} numberOfLines={2} style={styles.label}>
        {label}
      </AppText>
    </>
  );
  const style = [styles.tile, hero ? styles.hero : styles.surface];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${value} ${label}`}
        accessibilityHint={accessibilityHint}
        style={style}
      >
        {body}
      </PressableScale>
    );
  }
  return (
    <View style={style} accessible accessibilityLabel={`${value} ${label}`}>
      {body}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      minWidth: 0,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.small + 4,
      paddingVertical: Spacing.small + 4,
    },
    hero: {
      backgroundColor: colors.brandRaised,
    },
    surface: {
      backgroundColor: colors.surfaceMuted,
    },
    label: {
      marginTop: 2,
    },
  });
