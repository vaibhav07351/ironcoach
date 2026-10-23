import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MonthGrid } from '@/components/MonthGrid';
import { Screen } from '@/components/Screen';
import { Colors, Spacing, TouchTarget } from '@/constants/theme';
import { useAuth } from '../app/contexts/AuthContext';
import { useTraineeRecord } from '../app/contexts/TraineeRecordContext';
import { listAttendance, markAttended, unmarkAttended } from '../app/services/attendanceService';
import { errorMessage } from '../app/services/http';
import { monthLabel, monthRange, shiftMonth } from '../app/utils/calendar';
import { todayLocal } from '../app/utils/date';

/**
 * Attendance of the current client record, one month at a time. The trainer taps a day to mark or
 * unmark it; the client sees the same calendar read-only. Marking a day twice is harmless on the
 * server, and a failed change is rolled back on screen.
 */
export function AttendanceSection(): React.JSX.Element {
  const record = useTraineeRecord();
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer';
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [attended, setAttended] = useState<Set<string> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { from, to } = monthRange(view.year, view.month);
      setAttended(new Set(await listAttendance(record.id, from, to)));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [record.id, view]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggle = useCallback(
    async (date: string): Promise<void> => {
      const was = attended?.has(date) ?? false;
      const apply = (on: boolean): void =>
        setAttended((prev) => {
          const next = new Set(prev);
          if (on) {
            next.add(date);
          } else {
            next.delete(date);
          }
          return next;
        });
      apply(!was);
      try {
        await (was ? unmarkAttended(record.id, date) : markAttended(record.id, date));
      } catch (e: unknown) {
        apply(was);
        Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
      }
    },
    [attended, record.id]
  );

  const changeMonth = (delta: number): void => {
    setAttended(null);
    setView((v) => shiftMonth(v.year, v.month, delta));
  };

  const today = todayLocal();
  const showingThisMonth = today.startsWith(`${view.year}-${String(view.month + 1).padStart(2, '0')}`);

  if (!attended) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  return (
    <Screen>
      <Card>
        <View style={styles.header}>
          <Pressable onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.arrow}>
            <Ionicons name="chevron-back" size={22} color={Colors.primary} />
          </Pressable>
          <View style={styles.title}>
            <AppText variant="subheading" center>
              {monthLabel(view.year, view.month)}
            </AppText>
            <AppText variant="caption" tone="secondary" center>
              {attended.size} {attended.size === 1 ? 'session' : 'sessions'} attended
            </AppText>
          </View>
          <Pressable onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel="Next month" style={styles.arrow}>
            <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
          </Pressable>
        </View>
        <MonthGrid year={view.year} month={view.month} attended={attended} onToggle={isTrainer ? (d) => void toggle(d) : undefined} />
      </Card>
      {isTrainer ? (
        <>
          <AppText variant="caption" tone="secondary" center style={styles.hint}>
            Tap a day to mark it attended. Tap again to undo.
          </AppText>
          {showingThisMonth && !attended.has(today) ? (
            <Button title="Mark attended today" icon="checkmark-circle-outline" onPress={() => void toggle(today)} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.small,
  },
  arrow: {
    width: TouchTarget,
    height: TouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  hint: {
    marginVertical: Spacing.medium,
  },
});
