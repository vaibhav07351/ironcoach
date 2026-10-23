import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radii, Spacing, TouchTarget } from '@/constants/theme';
import { addDays, longDateLabel, relativeDayLabel, todayLocal } from '../app/utils/date';
import { AppText } from './AppText';

type Props = {
  /** Local calendar date YYYY-MM-DD. */
  date: string;
  onChange: (date: string) => void;
};

/** Previous / next day switcher. Future days are not reachable (nothing can be logged there). */
export function DayNavigator({ date, onChange }: Props): React.JSX.Element {
  const today = todayLocal();
  const atToday = date >= today;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(addDays(date, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        style={styles.arrow}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={Colors.primary} />
      </Pressable>
      <Pressable
        onPress={() => onChange(today)}
        disabled={atToday}
        accessibilityRole="button"
        accessibilityLabel={`Showing ${longDateLabel(date)}. Go to today`}
        style={styles.center}
      >
        <AppText variant="subheading" center>
          {relativeDayLabel(date)}
        </AppText>
        <AppText variant="caption" tone="secondary" center>
          {longDateLabel(date)}
        </AppText>
      </Pressable>
      <Pressable
        onPress={() => onChange(addDays(date, 1))}
        disabled={atToday}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        accessibilityState={{ disabled: atToday }}
        style={[styles.arrow, atToday ? styles.disabled : null]}
        hitSlop={8}
      >
        <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.medium,
  },
  arrow: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
  },
  disabled: {
    opacity: 0.3,
  },
});
