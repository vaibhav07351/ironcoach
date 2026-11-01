import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';

type Props = {
  /** 1-based. */
  current: number;
  total: number;
};

/** Segmented bar showing how far through a short setup flow the user is. */
export function StepProgress({ current, total }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < current ? styles.done : null]} />
      ))}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.small,
    },
    segment: {
      flex: 1,
      height: 5,
      borderRadius: Radii.pill,
      backgroundColor: colors.surfaceMuted,
    },
    done: {
      backgroundColor: colors.accent,
    },
  });
