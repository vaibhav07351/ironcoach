import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { errorMessage } from '../app/services/http';
import { listExerciseHistory } from '../app/services/workoutService';
import type { ExerciseSession, ExerciseType } from '../app/types/workout';
import { weekdayDateLabel } from '../app/utils/date';
import { mergeSessions } from '../app/utils/sessions';
import { AppText } from './AppText';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { SetRowItem } from './SetRowItem';

type Props = {
  traineeId: string;
  exerciseId: string;
  type: ExerciseType;
  /** Opens a past day on the Track tab to edit it. */
  onOpenDay: (date: string) => void;
};

const PAGE = 30;

/** History tab: every past session of the exercise, newest first, loaded a page at a time. */
export function ExerciseHistoryTab({ traineeId, exerciseId, type, onOpenDay }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  const [sessions, setSessions] = useState<ExerciseSession[] | null>(null);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFirst = useCallback(async () => {
    try {
      const page = await listExerciseHistory(traineeId, exerciseId, PAGE, 0);
      setSessions(page);
      setOffset(PAGE);
      setDone(page.length < PAGE);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId, exerciseId]);

  useFocusEffect(
    useCallback(() => {
      void loadFirst();
    }, [loadFirst])
  );

  const loadMore = async (): Promise<void> => {
    if (done || loadingMore || !sessions) return;
    setLoadingMore(true);
    try {
      const page = await listExerciseHistory(traineeId, exerciseId, PAGE, offset);
      setSessions((prev) => mergeSessions(prev ?? [], page));
      setOffset((o) => o + PAGE);
      setDone(page.length < PAGE);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  if (!sessions) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void loadFirst()} /> : <LoadingState />;
  }

  return (
    <FlatList
      style={webScrollFix}
      data={sessions}
      keyExtractor={(s) => s.date}
      contentContainerStyle={styles.content}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        <EmptyState icon="time-outline" title="No history yet" message="Sets you save on the Track tab show up here, day by day." />
      }
      ListFooterComponent={loadingMore ? <LoadingState /> : null}
      renderItem={({ item }) => (
        <View style={styles.day}>
          <AppText variant="label" tone="brand" style={styles.dayLabel}>
            {weekdayDateLabel(item.date).toUpperCase()}
          </AppText>
          <Card style={styles.card} onPress={() => onOpenDay(item.date)} accessibilityLabel={`Edit ${weekdayDateLabel(item.date)}`}>
            {item.entries.map((e, i) => (
              <SetRowItem key={i} index={i} type={type} entry={e} />
            ))}
          </Card>
        </View>
      )}
    />
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl, flexGrow: 1 },
    day: { marginBottom: Spacing.medium },
    dayLabel: { marginBottom: Spacing.xs + 2, letterSpacing: 0.5 },
    card: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
  });
