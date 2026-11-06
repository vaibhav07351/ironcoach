import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DayNavigator } from '@/components/DayNavigator';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { MetricChart } from '@/components/MetricChart';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Stepper } from '@/components/Stepper';
import { Spacing, webScrollFix } from '@/constants/theme';
import { STATS_RANGE_DAYS, STATS_RANGES } from '../constants/statsRanges';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useLengthUnit } from '../hooks/useLengthUnit';
import { deleteBodyMeasurement, getBodySeries, recordBodyMeasurement } from '../services/bodyService';
import { errorMessage } from '../services/http';
import type { RootStackParamList } from '../types/navigation';
import type { DatedValue } from '../types/progress';
import type { StatsRange } from '../types/workout';
import {
  bodyMetricLabel,
  bodyMetricStep,
  bodyMetricUnit,
  formatBodyValue,
  toDisplayValue,
  toStoredValue,
} from '../utils/bodyMetrics';
import { addDays, todayLocal, weekdayDateLabel } from '../utils/date';
import { confirmAction } from '../utils/confirm';
import { formatNumber } from '../utils/exerciseFormat';
import { haptic } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'BodyMetric'>;

type Tab = 'track' | 'history' | 'graph';
const TABS: { value: Tab; label: string }[] = [
  { value: 'track', label: 'Track' },
  { value: 'history', label: 'History' },
  { value: 'graph', label: 'Graph' },
];

/** One body measurement: record a value, see the history, see the trend. */
export default function BodyMetricScreen({ route, navigation }: Props): React.JSX.Element {
  const { traineeId, metric } = route.params;
  const styles = useThemedStyles(makeStyles);
  const unit = useLengthUnit();
  const [tab, setTab] = useState<Tab>('track');
  const [series, setSeries] = useState<DatedValue[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState(todayLocal());
  // What the user typed; null shows the pre-fill (that day's value, else the latest).
  const [typed, setTyped] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState<StatsRange>('6m');
  const unitLabel = bodyMetricUnit(metric, unit);

  useLayoutEffect(() => {
    navigation.setOptions({ title: bodyMetricLabel(metric) });
  }, [navigation, metric]);

  const load = useCallback(async () => {
    try {
      setSeries(await getBodySeries(traineeId, metric, 'all'));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId, metric]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const prefill = useMemo(() => {
    const onDay = series?.find((p) => p.date === date) ?? series?.[series.length - 1];
    return onDay ? formatNumber(toDisplayValue(metric, onDay.value, unit), 2) : '';
  }, [series, date, metric, unit]);
  const value = typed ?? prefill;

  const graphPoints = useMemo(() => {
    const days = STATS_RANGE_DAYS[range];
    if (!series || days === null) return series ?? [];
    const from = addDays(todayLocal(), -days);
    return series.filter((p) => p.date >= from);
  }, [series, range]);

  const onSave = async (): Promise<void> => {
    const shown = Number(value);
    if (!value.trim() || !Number.isFinite(shown) || shown <= 0) {
      Toast.show({ type: 'error', text1: `Enter the ${bodyMetricLabel(metric).toLowerCase()}` });
      return;
    }
    setSaving(true);
    try {
      await recordBodyMeasurement({ trainee_id: traineeId, metric, date, value: toStoredValue(metric, shown, unit) });
      haptic('success');
      Toast.show({ type: 'success', text1: `${bodyMetricLabel(metric)} saved` });
      setTyped(null);
      await load();
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not saved', text2: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (p: DatedValue): Promise<void> => {
    const ok = await confirmAction({
      title: 'Delete this measurement?',
      message: `${formatBodyValue(metric, p.value, unit)} on ${weekdayDateLabel(p.date)}.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBodyMeasurement(traineeId, metric, p.date);
      setSeries((prev) => prev?.filter((x) => x.date !== p.date) ?? null);
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Not deleted', text2: errorMessage(e) });
    }
  };

  if (!series) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <SegmentedControl options={TABS} value={tab} onChange={setTab} accessibilityLabel="Measurement view" />
      </View>
      <ScrollView style={webScrollFix} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === 'track' ? (
          <>
            <DayNavigator
              date={date}
              onChange={(d) => {
                setTyped(null);
                setDate(d);
              }}
            />
            <Stepper
              label={`${bodyMetricLabel(metric)} (${unitLabel})`}
              value={value}
              onChange={setTyped}
              step={unitLabel === 'cm' ? 0.5 : bodyMetricStep(metric)}
              max={unitLabel === 'in' ? 100 : 400}
            />
            <Button title="Save" icon="checkmark" onPress={() => void onSave()} loading={saving} />
            <AppText variant="caption" tone="secondary" style={styles.hint}>
              Saving again on the same day replaces that day&apos;s value.
            </AppText>
          </>
        ) : null}

        {tab === 'history' ? (
          series.length === 0 ? (
            <AppText tone="secondary" center style={styles.hint}>
              No values yet. Record one on the Track tab.
            </AppText>
          ) : (
            <Card style={styles.list}>
              {[...series].reverse().map((p, i) => (
                <View key={p.date} style={[styles.row, i > 0 ? styles.divider : null]}>
                  <AppText style={styles.flex}>{weekdayDateLabel(p.date)}</AppText>
                  <AppText variant="subheading" style={styles.num}>
                    {formatBodyValue(metric, p.value, unit)}
                  </AppText>
                  {metric !== 'bodyweight' ? (
                    <IconButton icon="trash-outline" tone="danger" accessibilityLabel={`Delete ${weekdayDateLabel(p.date)}`} onPress={() => void onDelete(p)} />
                  ) : null}
                </View>
              ))}
            </Card>
          )
        ) : null}

        {tab === 'graph' ? (
          <>
            <SegmentedControl options={STATS_RANGES} value={range} onChange={setRange} accessibilityLabel="Time range" style={styles.range} />
            <Card>
              <MetricChart
                points={graphPoints.map((p) => ({ date: p.date, value: toDisplayValue(metric, p.value, unit) }))}
                format={(v) => `${formatNumber(v, 2)} ${unitLabel}`}
                decimals={1}
                emptyText="Nothing recorded in this range yet."
              />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    tabs: { paddingHorizontal: Spacing.medium, paddingTop: Spacing.small, paddingBottom: Spacing.xs },
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    hint: { marginTop: Spacing.small + 4 },
    list: { paddingVertical: 0 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: Spacing.small },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    flex: { flex: 1, minWidth: 0 },
    num: { fontVariant: ['tabular-nums'] },
    range: { marginBottom: Spacing.small + 4 },
  });
