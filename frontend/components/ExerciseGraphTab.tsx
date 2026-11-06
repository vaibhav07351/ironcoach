import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Spacing, webScrollFix } from '@/constants/theme';
import { STATS_RANGES } from '../app/constants/statsRanges';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { errorMessage } from '../app/services/http';
import { getExerciseStats } from '../app/services/workoutService';
import type { ExerciseStats, ExerciseType, SeriesKey, StatsRange } from '../app/types/workout';
import { shortDayMonth } from '../app/utils/date';
import {
  chartScale,
  formatDistance,
  formatDuration,
  formatKg,
  formatNumber,
  formatSeriesValue,
  seriesOptions,
} from '../app/utils/exerciseFormat';
import { AppText } from './AppText';
import { Card } from './Card';
import { Chip } from './Chip';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { MetricChart } from './MetricChart';
import { SectionHeader } from './SectionHeader';
import { SegmentedControl } from './SegmentedControl';
import { StatTile } from './StatTile';

type Props = {
  traineeId: string;
  exerciseId: string;
  type: ExerciseType;
};

/** A graph metric, or the rep-max table. */
type MetricView = SeriesKey | 'records';

/** The headline bests for the exercise type, as up to three tiles. */
function bestTiles(type: ExerciseType, s: ExerciseStats): { value: string; label: string }[] {
  const b = s.bests;
  switch (type) {
    case 'distance_time':
      return [
        { value: b.max_distance_m ? formatDistance(b.max_distance_m) : '-', label: 'longest' },
        { value: b.best_pace_s_per_km ? formatDuration(b.best_pace_s_per_km) : '-', label: 'best pace /km' },
        { value: String(b.sessions), label: 'sessions' },
      ];
    case 'time':
      return [
        { value: b.max_duration_s ? formatDuration(b.max_duration_s) : '-', label: 'longest hold' },
        { value: String(b.sessions), label: 'sessions' },
      ];
    case 'reps':
      return [
        { value: String(b.max_reps || '-'), label: 'max reps' },
        { value: String(b.sessions), label: 'sessions' },
      ];
    default:
      return [
        // Tiles are narrow: the unit goes in the label so the number never gets cut off.
        { value: b.e1rm ? formatNumber(b.e1rm) : '-', label: 'best est. 1RM, kg' },
        { value: b.max_weight ? formatNumber(b.max_weight) : '-', label: 'heaviest, kg' },
        { value: String(b.sessions), label: 'sessions' },
      ];
  }
}

/** Graph tab: one metric over a time range, all-time bests, and the rep-max table. */
export function ExerciseGraphTab({ traineeId, exerciseId, type }: Props): React.JSX.Element {
  const styles = useThemedStyles(makeStyles);
  const options = seriesOptions(type);
  const [view, setView] = useState<MetricView>(options[0].key);
  const [range, setRange] = useState<StatsRange>('3m');
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setStats(await getExerciseStats(traineeId, exerciseId, range));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId, exerciseId, range]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!stats) {
    return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;
  }

  const scale = view === 'records' ? null : chartScale(view);

  return (
    <ScrollView style={webScrollFix} contentContainerStyle={styles.content}>
      <View style={styles.tiles}>
        {bestTiles(type, stats).map((t) => (
          <StatTile key={t.label} value={t.value} label={t.label} />
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metrics} contentContainerStyle={styles.metricsRow}>
        {options.map((o) => (
          <Chip key={o.key} label={o.label} selected={view === o.key} onPress={() => setView(o.key)} />
        ))}
        {type === 'weight_reps' ? (
          <Chip label="Personal records" selected={view === 'records'} onPress={() => setView('records')} />
        ) : null}
      </ScrollView>

      {view === 'records' ? (
        <Card style={styles.records}>
          {stats.rep_records.length === 0 ? (
            <AppText tone="secondary">Records appear after your first session.</AppText>
          ) : (
            stats.rep_records.map((r) => (
              <View key={r.reps} style={styles.recordRow}>
                <AppText variant="label" style={styles.recordReps}>
                  {`${r.reps} RM`}
                </AppText>
                <AppText variant="subheading" style={styles.recordValue}>
                  {formatKg(r.weight_kg)}
                </AppText>
                <AppText variant="caption" tone="secondary" style={styles.recordDate}>
                  {shortDayMonth(r.date)}
                </AppText>
              </View>
            ))
          )}
        </Card>
      ) : (
        <>
          <SegmentedControl options={STATS_RANGES} value={range} onChange={setRange} accessibilityLabel="Time range" style={styles.range} />
          <Card>
            <MetricChart
              points={stats.series[view] ?? []}
              format={(v) => formatSeriesValue(view, v)}
              scale={scale?.factor ?? 1}
              decimals={scale?.decimals ?? 1}
              emptyText="Nothing logged in this range yet."
            />
          </Card>
          {scale && scale.factor !== 1 ? (
            <AppText variant="caption" tone="muted" style={styles.axisNote}>
              {view === 'distance_m' ? 'Chart axis in km.' : 'Chart axis in minutes.'}
            </AppText>
          ) : null}
        </>
      )}
      <SectionHeader title="How it is measured" />
      <AppText variant="caption" tone="secondary">
        {type === 'weight_reps'
          ? 'Estimated 1RM is the weight you could likely lift once, from weight x (1 + reps / 30). A trophy marks a set that beats your best before that day.'
          : 'A trophy marks a set that beats your best before that day.'}
      </AppText>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    tiles: { flexDirection: 'row', gap: Spacing.small, marginBottom: Spacing.medium },
    metrics: { marginHorizontal: -Spacing.medium, marginBottom: Spacing.small },
    metricsRow: { paddingHorizontal: Spacing.medium },
    range: { marginBottom: Spacing.small + 4 },
    records: { paddingVertical: Spacing.xs },
    recordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.small + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    recordReps: { width: 64 },
    recordValue: { flex: 1, fontVariant: ['tabular-nums'] },
    recordDate: { width: 72, textAlign: 'right' },
    axisNote: { marginTop: Spacing.xs },
  });
