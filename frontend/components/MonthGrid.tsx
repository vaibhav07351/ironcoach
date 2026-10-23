import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { buildMonthCells } from '../app/utils/calendar';
import { todayLocal } from '../app/utils/date';
import { AppText } from './AppText';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Props = {
  year: number;
  /** 0-11. */
  month: number;
  /** Attended dates (YYYY-MM-DD). */
  attended: ReadonlySet<string>;
  /** Called with a date when a day is tapped. Omit for a read-only grid. Future days are never tappable. */
  onToggle?: (date: string) => void;
};

/** A month calendar with attended days filled in. */
export function MonthGrid({ year, month, attended, onToggle }: Props): React.JSX.Element {
  const cells = buildMonthCells(year, month);
  const today = todayLocal();
  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.row}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="caption" tone="muted">
              {d}
            </AppText>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => {
            if (!cell.date) {
              return <View key={c} style={styles.cell} />;
            }
            const date = cell.date;
            const isAttended = attended.has(date);
            const isFuture = date > today;
            const tappable = !!onToggle && !isFuture;
            return (
              <View key={c} style={styles.cell}>
                <Pressable
                  disabled={!tappable}
                  onPress={() => onToggle?.(date)}
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${isAttended ? ', attended' : ''}`}
                  accessibilityState={{ selected: isAttended, disabled: !tappable }}
                  style={[
                    styles.day,
                    isAttended ? styles.dayAttended : null,
                    date === today ? styles.dayToday : null,
                    isFuture ? styles.dayFuture : null,
                  ]}
                >
                  <AppText
                    variant="label"
                    style={{ color: isAttended ? Colors.textOnPrimary : isFuture ? Colors.textMuted : Colors.textPrimary }}
                  >
                    {cell.day}
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayAttended: {
    backgroundColor: Colors.primary,
  },
  dayToday: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  dayFuture: {
    opacity: 0.5,
  },
});
