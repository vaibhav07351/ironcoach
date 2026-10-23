import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DayNavigator } from '@/components/DayNavigator';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Colors, Spacing } from '@/constants/theme';
import { summarizeMetrics } from '../constants/activityFields';
import { ACTIVITY_OPTIONS, expertiseLabel } from '../constants/expertise';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { deleteWorkoutLog, listWorkoutLogs } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { WorkoutLog } from '../types/workout';
import { confirmAction } from '../utils/confirm';
import { todayLocal } from '../utils/date';

function setsSummary(reps: number[], weight: number[]): string {
  return reps.map((r, i) => `${r}×${weight[i] ?? 0}kg`).join(', ');
}

/** One day's workouts and sport sessions for the current client record. */
export default function WorkoutLogListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const [date, setDate] = useState(todayLocal());
  const [logs, setLogs] = useState<WorkoutLog[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLogs(await listWorkoutLogs(record.id, date));
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
  };

  const onDelete = async (log: WorkoutLog): Promise<void> => {
    const ok = await confirmAction({
      title: 'Delete this log?',
      message: 'The whole session is removed. This cannot be undone.',
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

  const startLog = (code: string): void => {
    if (code === 'gym') {
      navigation.navigate('WorkoutCategories', { traineeId: record.id, date });
    } else {
      navigation.navigate('LogSession', { traineeId: record.id, date, activityType: code });
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      <DayNavigator date={date} onChange={changeDate} />

      {logs === null ? (
        loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />
      ) : logs.length === 0 ? (
        <EmptyState icon="barbell-outline" title="Nothing logged" message="Pick what was trained below to add it." />
      ) : (
        logs.map((log) => {
          const isGym = (log.activity_type ?? 'gym') === 'gym';
          return (
            <Card key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <AppText variant="subheading">{expertiseLabel(log.activity_type ?? 'gym')}</AppText>
                <View style={styles.actions}>
                  {isGym ? (
                    <Button
                      title="Edit"
                      variant="ghost"
                      onPress={() => navigation.navigate('WorkoutLogForm', { traineeId: record.id, log })}
                    />
                  ) : null}
                  <Button title="Delete" variant="ghost" onPress={() => void onDelete(log)} />
                </View>
              </View>
              {isGym ? (
                (log.workouts ?? []).map((w, i) => (
                  <View key={`${w.exercise}-${i}`} style={styles.exercise}>
                    <AppText variant="label">{w.exercise}</AppText>
                    <AppText tone="secondary">
                      {w.sets} sets · {setsSummary(w.reps ?? [], w.weight ?? [])}
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText tone="secondary">{summarizeMetrics(log.activity_type ?? 'other', log.metrics) || 'Session'}</AppText>
              )}
              {log.notes ? (
                <AppText variant="caption" tone="muted" style={styles.notes}>
                  {log.notes}
                </AppText>
              ) : null}
            </Card>
          );
        })
      )}

      <AppText variant="label" tone="secondary" style={styles.addLabel}>
        Add to this day
      </AppText>
      <View style={styles.chips}>
        {ACTIVITY_OPTIONS.map((o) => (
          <Chip key={o.code} label={o.label} onPress={() => startLog(o.code)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.medium, paddingBottom: Spacing.xl },
  card: { marginBottom: Spacing.small },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row' },
  exercise: { marginTop: Spacing.small },
  notes: { marginTop: Spacing.small },
  addLabel: { marginTop: Spacing.large, marginBottom: Spacing.small },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
});
