import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { addDays, longDateLabel, relativeDayLabel, todayLocal } from '../app/utils/date';
import { AppText } from './AppText';

type Props = {
  /** Local calendar date YYYY-MM-DD. */
  date: string;
  onChange: (date: string) => void;
};

/** Previous / next day switcher. Future days are not reachable (nothing can be logged there). */
export function DayNavigator({ date, onChange }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const today = todayLocal();
  const atToday = date >= today;
  const go = (next: string): void => {
    haptic('select');
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => go(addDays(date, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        style={({ pressed }) => [styles.arrow, pressed ? styles.pressed : null]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={colors.tint} />
      </Pressable>
      <Pressable
        onPress={() => go(today)}
        disabled={atToday}
        accessibilityRole="button"
        accessibilityLabel={`Showing ${longDateLabel(date)}. Go to today`}
        style={styles.center}
      >
        <AppText variant="subheading" center>
          {relativeDayLabel(date)}
        </AppText>
        <AppText variant="caption" tone="secondary" center>
          {atToday ? longDateLabel(date) : `${longDateLabel(date)}, tap for today`}
        </AppText>
      </Pressable>
      <Pressable
        onPress={() => go(addDays(date, 1))}
        disabled={atToday}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: atToday }}
        style={({ pressed }) => [styles.arrow, atToday ? styles.disabled : null, pressed ? styles.pressed : null]}
        hitSlop={8}
      >
        <Ionicons name="chevron-forward" size={22} color={colors.tint} />
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors, elevation }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radii.lg,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.xs,
      marginBottom: Spacing.medium,
      ...elevation(1),
    },
    arrow: {
      width: TouchTarget,
      height: TouchTarget,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      backgroundColor: colors.surfaceMuted,
    },
    center: {
      flex: 1,
    },
    disabled: {
      opacity: 0.3,
    },
  });
