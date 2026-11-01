import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DayNavigator } from '@/components/DayNavigator';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconBadge } from '@/components/IconBadge';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { Radii, Spacing, webScrollFix } from '@/constants/theme';
import { summarizeMetrics } from '../constants/activityFields';
import { ACTIVITY_OPTIONS, expertiseLabel } from '../constants/expertise';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { deleteWorkoutLog, listWorkoutLogs } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';
import type { WorkoutLog } from '../types/workout';
import { confirmAction } from '../utils/confirm';
import { todayLocal } from '../utils/date';

/** One day's workouts and sport sessions for the current client record. */
export default function WorkoutLogListScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const record = useTraineeRecord();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      <DayNavigator date={date} onChange={changeDate} />

      {logs === null ? (
        loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : (
          <LoadingState />
        )
      ) : logs.length === 0 ? (
        <EmptyState icon="barbell-outline" title="Nothing logged" message="Pick what was trained below to add it." />
      ) : (
        logs.map((log) => {
          const isGym = (log.activity_type ?? 'gym') === 'gym';
          return (
            <Card key={log.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <IconBadge name={isGym ? 'barbell' : 'fitness'} size={36} />
                <AppText variant="subheading" style={styles.flex} numberOfLines={1}>
                  {expertiseLabel(log.activity_type ?? 'gym')}
                </AppText>
                {isGym ? (
                  <IconButton
                    icon="create-outline"
                    accessibilityLabel="Edit this workout"
                    onPress={() => navigation.navigate('WorkoutLogForm', { traineeId: record.id, log })}
                  />
                ) : null}
                <IconButton
                  icon="trash-outline"
                  tone="danger"
                  accessibilityLabel="Delete this log"
                  onPress={() => void onDelete(log)}
                />
              </View>
              {isGym ? (
                (log.workouts ?? []).map((w, i) => (
                  <View key={`${w.exercise}-${i}`} style={styles.exercise}>
                    <AppText variant="label">
                      {w.exercise}
                      <AppText variant="caption" tone="muted">
                        {`  ${w.sets} ${w.sets === 1 ? 'set' : 'sets'}`}
                      </AppText>
                    </AppText>
                    <View style={styles.sets}>
                      {(w.reps ?? []).map((r, si) => (
                        <View key={si} style={styles.set}>
                          <AppText variant="caption" style={styles.setText}>
                            {`${r} x ${w.weight?.[si] ?? 0} kg`}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <AppText tone="secondary" style={styles.metrics}>
                  {summarizeMetrics(log.activity_type ?? 'other', log.metrics) || 'Session'}
                </AppText>
              )}
              {log.notes ? (
                <AppText variant="caption" tone="secondary" style={styles.notes}>
                  {log.notes}
                </AppText>
              ) : null}
            </Card>
          );
        })
      )}

      <SectionHeader title="Add to this day" />
      <View style={styles.chips}>
        {ACTIVITY_OPTIONS.map((o) => (
          <Chip key={o.code} label={o.label} icon="add" onPress={() => startLog(o.code)} />
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { backgroundColor: colors.bg },
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    card: { marginBottom: Spacing.small + 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small },
    flex: { flex: 1, minWidth: 0 },
    exercise: {
      marginTop: Spacing.small + 4,
      paddingTop: Spacing.small + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    sets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs + 2, marginTop: Spacing.small },
    set: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: Radii.sm,
      paddingHorizontal: Spacing.small,
      paddingVertical: 3,
    },
    setText: { fontWeight: '600', fontVariant: ['tabular-nums'], color: colors.text },
    metrics: { marginTop: Spacing.small },
    notes: { marginTop: Spacing.small + 4, fontStyle: 'italic' },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
  });
