import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { ActivityLogButtons } from '@/components/ActivityLogButtons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { DayNavigator } from '@/components/DayNavigator';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ExerciseDayCard } from '@/components/ExerciseDayCard';
import { IconBadge } from '@/components/IconBadge';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { WorkoutCalendar } from '@/components/WorkoutCalendar';
import { Spacing, webScrollFix } from '@/constants/theme';
import { summarizeMetrics } from '../constants/activityFields';
import { expertiseLabel } from '../constants/expertise';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { deleteWorkoutLog, listWorkoutLogs } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { ExerciseType, WorkoutLog } from '../types/workout';
import { confirmAction } from '../utils/confirm';
import { todayLocal } from '../utils/date';
import { entriesOf } from '../utils/sets';

/** A day's logs in the order they were done; exercise logs and sport sessions are kept apart. */
function splitLogs(logs: WorkoutLog[]): { exercises: WorkoutLog[]; sessions: WorkoutLog[] } {
  const ordered = [...logs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    exercises: ordered.filter((l) => (l.workouts?.length ?? 0) > 0),
    sessions: ordered.filter((l) => (l.workouts?.length ?? 0) === 0),
  };
}

/** One day of training for the current client record, like a page of a gym notebook. */
export default function WorkoutLogListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [date, setDate] = useState(todayLocal());
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const load = useCallback(async () => {
    try {
      setLogs(await listWorkoutLogs(record.id, date, 100));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [record.id, date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const changeDate = (next: string): void => {
    setLogs(null);
    setDate(next);
    setShowCalendar(false);
  };

  const onDelete = async (log: WorkoutLog, what: string): Promise<void> => {
    const ok = await confirmAction({
      title: `Delete ${what}?`,
      message: 'It is removed from this day. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteWorkoutLog(log.id);
      setLogs((prev) => (prev ? prev.filter((l) => l.id !== log.id) : prev));
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(e) });
    }
  };

  const { exercises, sessions } = splitLogs(logs ?? []);

  return (
    <ScrollView
      style={[webScrollFix, styles.root]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.tint}
          colors={[colors.tint]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <View style={styles.dayRow}>
        <View style={styles.flex}>
          <DayNavigator date={date} onChange={changeDate} />
        </View>
        <IconButton
          icon={showCalendar ? 'close' : 'calendar-outline'}
          accessibilityLabel={showCalendar ? 'Hide calendar' : 'Show calendar'}
          onPress={() => setShowCalendar((v) => !v)}
          style={styles.calendarButton}
        />
      </View>
      {showCalendar ? <WorkoutCalendar traineeId={record.id} date={date} onPick={changeDate} /> : null}

      {logs === null ? (
        loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : (
          <LoadingState />
        )
      ) : logs.length === 0 ? (
        <EmptyState icon="barbell-outline" title="Nothing logged" message="Pick what was trained below to add it." />
      ) : (
        <>
          {exercises.map((log) =>
            (log.workouts ?? []).map((w, i) => {
              const keyed = !!log.exercise_key;
              const type: ExerciseType = w.type ?? 'weight_reps';
              const canOpen = keyed && !!w.exercise_id;
              return (
                <ExerciseDayCard
                  key={`${log.id}-${i}`}
                  name={w.exercise}
                  type={type}
                  entries={entriesOf(w)}
                  onOpen={
                    canOpen
                      ? () =>
                          navigation.navigate('Exercise', {
                            traineeId: record.id,
                            exerciseId: w.exercise_id as string,
                            exerciseName: w.exercise,
                            exerciseType: type,
                            date,
                          })
                      : undefined
                  }
                  onEditLegacy={keyed ? undefined : () => navigation.navigate('WorkoutLogForm', { traineeId: record.id, log })}
                  onDelete={() =>
                    void onDelete(log, keyed || (log.workouts?.length ?? 0) === 1 ? w.exercise : 'this whole workout (all its exercises)')
                  }
                />
              );
            })
          )}
          {sessions.map((log) => (
            <Card key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <IconBadge name="fitness" size={36} />
                <AppText variant="subheading" style={styles.flex} numberOfLines={1}>
                  {expertiseLabel(log.activity_type ?? 'other')}
                </AppText>
                <IconButton icon="trash-outline" tone="danger" accessibilityLabel="Delete this session" onPress={() => void onDelete(log, 'this session')} />
              </View>
              <AppText tone="secondary" style={styles.metrics}>
                {summarizeMetrics(log.activity_type ?? 'other', log.metrics) || 'Session'}
              </AppText>
              {log.notes ? (
                <AppText variant="caption" tone="secondary" style={styles.notes}>
                  {log.notes}
                </AppText>
              ) : null}
            </Card>
          ))}
        </>
      )}

      <SectionHeader title="Add to this day" />
      <ActivityLogButtons traineeId={record.id} clientName={record.name} date={date} />
      {exercises.length > 0 ? (
        <AppText variant="caption" tone="secondary" style={styles.hint}>
          Tap an exercise above to add sets, or to see its history and graph.
        </AppText>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { backgroundColor: colors.bg },
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    dayRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
    calendarButton: { marginTop: Spacing.small },
    card: { marginBottom: Spacing.small + 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    flex: { flex: 1, minWidth: 0 },
    metrics: { marginTop: Spacing.small },
    notes: { marginTop: Spacing.small + 4, fontStyle: 'italic' },
    hint: { marginTop: Spacing.small },
  });
