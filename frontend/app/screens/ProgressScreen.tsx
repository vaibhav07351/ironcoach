import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { IconBadge } from '@/components/IconBadge';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useTraineeRecord } from '../contexts/TraineeRecordContext';
import { errorMessage } from '../services/http';
import { getProgress, logWeight } from '../services/progressService';
import type { Progress } from '../types/progress';
import { relativeDayLabel, todayLocal } from '../utils/date';

const CHART_POINTS = 12;

/** Weight trend, today's weigh-in and best lifts for the current client record. */
export default function ProgressScreen(): React.JSX.Element {
  const record = useTraineeRecord();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [data, setData] = useState<Progress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await getProgress(record.id));
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

  const onLogWeight = async (): Promise<void> => {
    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      Toast.show({ type: 'error', text1: 'Enter weight in kg', text2: 'Between 20 and 400' });
      return;
    }
    setSaving(true);
    try {
      await logWeight({ trainee_id: record.id, date: todayLocal(), weight: kg });
      setWeight('');
      Toast.show({ type: 'success', text1: 'Weight saved' });
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!data) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  const weights = (data.weight_bmi ?? []).slice(-CHART_POINTS);
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const change = latest && first && weights.length >= 2 ? Math.round((latest.weight - first.weight) * 10) / 10 : null;
  const exercises = [...(data.exercises ?? [])].sort((a, b) => b.max_weight - a.max_weight);

  return (
    <ScrollView
      style={[webScrollFix, styles.root]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
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
      <Card>
        <AppText variant="label" tone="secondary">
          Weight
        </AppText>
        {latest ? (
          <>
            <View style={styles.latestRow}>
              <AppText variant="number">{latest.weight}</AppText>
              <AppText variant="subheading" tone="secondary" style={styles.unit}>
                kg
              </AppText>
              {latest.bmi ? <Badge label={`BMI ${latest.bmi.toFixed(1)}`} tone="brand" style={styles.bmi} /> : null}
            </View>
            <AppText variant="caption" tone="secondary">
              {relativeDayLabel(latest.date)}
              {change !== null && change !== 0
                ? `, ${change > 0 ? '+' : ''}${change} kg over the last ${weights.length} weigh-ins`
                : ''}
            </AppText>
          </>
        ) : (
          <AppText tone="secondary" style={styles.none}>
            No weigh-ins yet. Add today&apos;s below.
          </AppText>
        )}
        <View style={styles.chartBox} onLayout={(e) => setChartWidth(Math.floor(e.nativeEvent.layout.width))}>
          {weights.length >= 2 && chartWidth > 0 ? (
            <LineChart
              data={{ labels: weights.map((w) => w.date.slice(5)), datasets: [{ data: weights.map((w) => w.weight) }] }}
              width={chartWidth}
              height={180}
              yAxisSuffix=""
              withInnerLines={false}
              withOuterLines={false}
              chartConfig={{
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 1,
                color: (opacity = 1) => (opacity < 1 ? colors.tintSoft : colors.tint),
                labelColor: () => colors.textMuted,
                propsForDots: { r: '4', strokeWidth: '2', stroke: colors.surface },
              }}
              bezier
              style={styles.chart}
            />
          ) : null}
        </View>
        <View style={styles.weighIn}>
          <View style={styles.flex}>
            <TextField
              label="Today's weight (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={6}
              placeholder="e.g. 72.5"
            />
          </View>
          <Button title="Save" onPress={() => void onLogWeight()} loading={saving} disabled={!weight.trim()} style={styles.save} />
        </View>
      </Card>

      <SectionHeader title="Best lifts" />
      {exercises.length === 0 ? (
        <Card>
          <View style={styles.emptyLifts}>
            <IconBadge name="trophy-outline" tone="accent" size={40} />
            <AppText tone="secondary" style={styles.flex}>
              Logged gym exercises show their best weight here.
            </AppText>
          </View>
        </Card>
      ) : (
        <Card style={styles.liftsCard}>
          {exercises.map((e, i) => (
            <View key={e.exercise} style={[styles.lift, i > 0 ? styles.liftDivider : null]}>
              <AppText style={styles.flex} numberOfLines={1}>
                {e.exercise}
              </AppText>
              <AppText variant="subheading" style={styles.liftValue}>
                {e.max_weight} kg
              </AppText>
              <AppText variant="caption" tone="muted" style={styles.avg}>
                avg {Math.round(e.avg_weight)}
              </AppText>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { backgroundColor: colors.bg },
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    latestRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: Spacing.xs },
    unit: { marginLeft: Spacing.xs },
    bmi: { marginLeft: Spacing.small + 4, alignSelf: 'center' },
    none: { marginTop: Spacing.xs },
    chartBox: { marginTop: Spacing.small, marginHorizontal: -Spacing.small },
    chart: { marginLeft: -Spacing.small },
    weighIn: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.small, marginTop: Spacing.medium },
    save: { marginBottom: Spacing.medium },
    flex: { flex: 1, minWidth: 0 },
    emptyLifts: { flexDirection: 'row', alignItems: 'center', gap: Spacing.small + 4 },
    liftsCard: { paddingVertical: Spacing.xs },
    lift: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.small + 4 },
    liftDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    liftValue: { fontVariant: ['tabular-nums'] },
    avg: { width: 64, textAlign: 'right' },
  });
