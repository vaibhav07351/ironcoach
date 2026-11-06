import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, webScrollFix } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { useTraineeRecord } from '../app/contexts/TraineeRecordContext';
import { useLengthUnit } from '../app/hooks/useLengthUnit';
import { errorMessage } from '../app/services/http';
import { getProgressSummary } from '../app/services/progressService';
import type { RootStackParamList } from '../app/types/navigation';
import type { MonthStats, ProgressSummary, ValueChange } from '../app/types/progress';
import { bodyMetricLabel, formatBodyChange, formatBodyValue } from '../app/utils/bodyMetrics';
import { agoLabel, longDateLabel, relativeDayLabel } from '../app/utils/date';
import { formatKg, formatNumber, formatScore, formatScoreChange } from '../app/utils/exerciseFormat';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { SectionHeader } from './SectionHeader';
import { StatTile } from './StatTile';

const MONTH_ROWS: { key: keyof Omit<MonthStats, 'month'>; label: string; format: (v: number) => string }[] = [
  { key: 'workout_days', label: 'Workout days', format: (v) => String(v) },
  { key: 'sets', label: 'Sets', format: (v) => String(v) },
  { key: 'volume_kg', label: 'Volume lifted', format: (v) => (v >= 1000 ? `${formatNumber(v / 1000, 1)} t` : formatKg(v)) },
  { key: 'prs', label: 'Personal records', format: (v) => String(v) },
];

/** Progress: since joining, this month against last month, lifts and recent records. */
export function ProgressSummarySection(): React.JSX.Element {
  const record = useTraineeRecord();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const unit = useLengthUnit();
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getProgressSummary(record.id));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [record.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!data) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  const body: ValueChange[] = [...(data.bodyweight ? [data.bodyweight] : []), ...data.measurements].filter(
    (c) => c.first.date !== c.latest.date
  );
  // Tiles are narrow: the number alone, the unit in the label.
  const weightDiff = data.bodyweight ? Math.round((data.bodyweight.latest.value - data.bodyweight.first.value) * 10) / 10 : null;
  const weightChange = weightDiff === null ? null : `${weightDiff > 0 ? '+' : ''}${formatNumber(weightDiff)}`;
  const nothingYet = data.workout_days_total === 0 && body.length === 0;

  return (
    <ScrollView
      style={webScrollFix}
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
      <AppText variant="caption" tone="secondary" style={styles.since}>
        {`Since ${longDateLabel(data.since)} (${agoLabel(data.since)})`}
      </AppText>
      <View style={styles.tiles}>
        <StatTile value={data.workout_days_total} label="workout days" />
        <StatTile value={weightChange ?? '-'} label="weight change, kg" />
        <StatTile value={data.this_month.prs} label="PRs this month" />
      </View>

      {nothingYet ? (
        <EmptyState icon="trending-up" title="Progress shows up here" message="Log workouts and measurements and the changes appear on this page." />
      ) : null}

      <SectionHeader title="This month vs last month" />
      <Card style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.flex} />
          <AppText variant="caption" tone="secondary" style={styles.col}>This</AppText>
          <AppText variant="caption" tone="secondary" style={styles.col}>Last</AppText>
        </View>
        {MONTH_ROWS.map((r) => (
          <View key={r.key} style={[styles.tableRow, styles.divider]}>
            <AppText style={styles.flex}>{r.label}</AppText>
            <AppText variant="label" style={styles.col}>{r.format(data.this_month[r.key])}</AppText>
            <AppText tone="secondary" style={styles.col}>{r.format(data.last_month[r.key])}</AppText>
          </View>
        ))}
      </Card>

      {data.lifts.length > 0 ? (
        <>
          <SectionHeader title="Exercises, first session to latest" />
          <Card style={styles.table}>
            {data.lifts.map((l, i) => {
              const change = formatScoreChange(l.kind, l.first.value, l.latest.value);
              return (
                <Pressable
                  key={l.exercise_id}
                  onPress={() =>
                    !l.exercise_id.startsWith('name:') &&
                    navigation.navigate('Exercise', {
                      traineeId: record.id,
                      exerciseId: l.exercise_id,
                      exerciseName: l.exercise,
                      exerciseType: l.type,
                      date: l.latest.date,
                      tab: 'graph',
                    })
                  }
                  disabled={l.exercise_id.startsWith('name:')}
                  accessibilityRole="button"
                  accessibilityLabel={`${l.exercise}: ${formatScore(l.kind, l.first.value)} to ${formatScore(l.kind, l.latest.value)}. Open graph.`}
                  style={[styles.tableRow, i > 0 ? styles.divider : null]}
                >
                  <View style={styles.flex}>
                    <AppText variant="label" numberOfLines={1}>{l.exercise}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {`${formatScore(l.kind, l.first.value)} to ${formatScore(l.kind, l.latest.value)}, ${l.sessions} sessions`}
                    </AppText>
                  </View>
                  {change ? (
                    <AppText variant="label" tone={change.startsWith('+') ? 'success' : 'secondary'}>{change}</AppText>
                  ) : null}
                </Pressable>
              );
            })}
          </Card>
          <AppText variant="caption" tone="muted" style={styles.note}>
            Weights compare the estimated 1RM; cardio the longest distance.
          </AppText>
        </>
      ) : null}

      {body.length > 0 ? (
        <>
          <SectionHeader title="Body, first measurement to latest" />
          <Card style={styles.table}>
            {body.map((c, i) => (
              <View key={c.metric} style={[styles.tableRow, i > 0 ? styles.divider : null]}>
                <View style={styles.flex}>
                  <AppText variant="label">{bodyMetricLabel(c.metric)}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {`${formatBodyValue(c.metric, c.first.value, unit)} to ${formatBodyValue(c.metric, c.latest.value, unit)}`}
                  </AppText>
                </View>
                <AppText variant="label">{formatBodyChange(c.metric, c.first.value, c.latest.value, unit) ?? 'no change'}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {data.recent_prs.length > 0 ? (
        <>
          <SectionHeader title="Recent personal records" />
          <Card style={styles.table}>
            {data.recent_prs.map((p, i) => (
              <View key={`${p.exercise_id}-${p.date}`} style={[styles.tableRow, i > 0 ? styles.divider : null]}>
                <Ionicons name="trophy" size={18} color={colors.onAccentSoft} style={styles.trophy} />
                <View style={styles.flex}>
                  <AppText variant="label" numberOfLines={1}>{p.exercise}</AppText>
                  <AppText variant="caption" tone="secondary">{relativeDayLabel(p.date)}</AppText>
                </View>
                <AppText variant="label">{formatScore(p.kind, p.value)}</AppText>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Button
        title="Compare two dates"
        icon="git-compare-outline"
        variant="secondary"
        onPress={() => navigation.navigate('CompareProgress', { traineeId: record.id, since: data.since })}
        style={styles.compare}
      />
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    since: { marginBottom: Spacing.small },
    tiles: { flexDirection: 'row', gap: Spacing.small },
    table: { paddingVertical: Spacing.xs },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.small + 2, gap: Spacing.small },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    flex: { flex: 1, minWidth: 0 },
    col: { width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
    note: { marginTop: Spacing.xs },
    trophy: { marginRight: Spacing.xs },
    compare: { marginTop: Spacing.large },
  });
