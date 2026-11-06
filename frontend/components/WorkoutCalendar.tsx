import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { errorMessage } from '../app/services/http';
import { listLoggedDates } from '../app/services/workoutService';
import { monthLabel, monthRange, shiftMonth } from '../app/utils/calendar';
import { parseLocalDate, todayLocal } from '../app/utils/date';
import { AppText } from './AppText';
import { Card } from './Card';
import { IconButton } from './IconButton';
import { MonthGrid } from './MonthGrid';

type Props = {
  traineeId: string;
  /** The selected day (YYYY-MM-DD); the calendar opens on its month. */
  date: string;
  onPick: (date: string) => void;
};

/** A month with every logged day filled in. Tap a day to open it. */
export function WorkoutCalendar({ traineeId, date, onPick }: Props): React.JSX.Element {
  const start = parseLocalDate(date) ?? new Date();
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [dates, setDates] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => monthRange(view.year, view.month), [view]);
  const today = todayLocal();
  const atThisMonth = range.to >= today;

  useEffect(() => {
    let cancelled = false;
    listLoggedDates(traineeId, range.from, range.to)
      .then((list) => {
        if (!cancelled) {
          setDates(new Set(list));
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [traineeId, range]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" accessibilityLabel="Previous month" onPress={() => setView((v) => shiftMonth(v.year, v.month, -1))} />
        <AppText variant="subheading" center style={styles.flex}>
          {monthLabel(view.year, view.month)}
        </AppText>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Next month"
          disabled={atThisMonth}
          onPress={() => setView((v) => shiftMonth(v.year, v.month, 1))}
        />
      </View>
      <MonthGrid year={view.year} month={view.month} attended={dates} onToggle={onPick} />
      {error ? (
        <AppText variant="caption" tone="error" center style={styles.note}>
          {error}
        </AppText>
      ) : (
        <AppText variant="caption" tone="secondary" center style={styles.note}>
          {`${dates.size} ${dates.size === 1 ? 'day' : 'days'} logged. Tap a day to open it.`}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.medium },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.small },
  flex: { flex: 1 },
  note: { marginTop: Spacing.small },
});
