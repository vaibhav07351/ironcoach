import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ExerciseGraphTab } from '@/components/ExerciseGraphTab';
import { ExerciseHistoryTab } from '@/components/ExerciseHistoryTab';
import { ExerciseTrackTab } from '@/components/ExerciseTrackTab';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import type { ExerciseTab, RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

const TABS: { value: ExerciseTab; label: string }[] = [
  { value: 'track', label: 'Track' },
  { value: 'history', label: 'History' },
  { value: 'graph', label: 'Graph' },
];

/** One exercise: log today's sets (Track), see every past session (History), see progress (Graph). */
export default function ExerciseScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, exerciseId, exerciseName, exerciseType = 'weight_reps' } = route.params;
  const styles = useThemedStyles(makeStyles);
  const [tab, setTab] = useState<ExerciseTab>(route.params.tab ?? 'track');
  const [date, setDate] = useState(route.params.date);

  useLayoutEffect(() => {
    navigation.setOptions({ title: exerciseName });
  }, [navigation, exerciseName]);

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} accessibilityLabel="Exercise view" />
      </View>
      <View style={styles.body}>
        {tab === 'track' ? (
          <ExerciseTrackTab traineeId={traineeId} exerciseId={exerciseId} date={date} onDateChange={setDate} />
        ) : null}
        {tab === 'history' ? (
          <ExerciseHistoryTab
            traineeId={traineeId}
            exerciseId={exerciseId}
            type={exerciseType}
            onOpenDay={(d) => {
              setDate(d);
              setTab('track');
            }}
          />
        ) : null}
        {tab === 'graph' ? <ExerciseGraphTab traineeId={traineeId} exerciseId={exerciseId} type={exerciseType} /> : null}
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    tabs: { paddingHorizontal: Spacing.medium, paddingTop: Spacing.small, paddingBottom: Spacing.xs },
    body: { flex: 1, minHeight: 0 },
  });
