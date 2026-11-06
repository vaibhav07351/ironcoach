import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import { Spacing, webScrollFix } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../contexts/ThemeContext';
import { useLengthUnit } from '../hooks/useLengthUnit';
import { errorMessage } from '../services/http';
import { compareProgress } from '../services/progressService';
import type { RootStackParamList } from '../types/navigation';
import type { CompareResult, CompareRow } from '../types/progress';
import { bodyMetricLabel, formatBodyChange, formatBodyValue, type LengthUnit } from '../utils/bodyMetrics';
import { addDays, longDateLabel, parseLocalDate, shortDayMonth, todayLocal } from '../utils/date';
import { formatScore, formatScoreChange } from '../utils/exerciseFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'CompareProgress'>;

type Preset = { label: string; date: string };

function rowText(row: CompareRow, unit: LengthUnit): { label: string; from: string; to: string; change: string | null } {
  if (row.kind === 'body') {
    return {
      label: bodyMetricLabel(row.key),
      from: row.from ? formatBodyValue(row.key, row.from.value, unit) : '-',
      to: row.to ? formatBodyValue(row.key, row.to.value, unit) : '-',
      change: row.from && row.to ? formatBodyChange(row.key, row.from.value, row.to.value, unit) : null,
    };
  }
  return {
    label: row.label ?? 'Exercise',
    from: row.from ? formatScore(row.score, row.from.value) : '-',
    to: row.to ? formatScore(row.score, row.to.value) : '-',
    change: row.from && row.to ? formatScoreChange(row.score, row.from.value, row.to.value) : null,
  };
}

/** Side by side: body measurements and exercises at two dates. */
export default function CompareProgressScreen({ route }: Props): React.JSX.Element {
  const { traineeId, since } = route.params;
  const styles = useThemedStyles(makeStyles);
  const unit = useLengthUnit();
  const today = todayLocal();
  const presets = useMemo<Preset[]>(
    () => [
      ...(since && since < today ? [{ label: 'Joined', date: since }] : []),
      { label: '6 months ago', date: addDays(today, -182) },
      { label: '3 months ago', date: addDays(today, -91) },
      { label: '1 month ago', date: addDays(today, -30) },
    ],
    [since, today]
  );
  const [from, setFrom] = useState(presets[0].date);
  const [custom, setCustom] = useState('');
  const [loaded, setLoaded] = useState<CompareResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoaded(await compareProgress(traineeId, from, today));
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(errorMessage(e));
    }
  }, [traineeId, from, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Only the answer for the chosen start date counts; anything else is still loading.
  const result = loaded && loaded.from === from ? loaded : null;
  const customValid = !!parseLocalDate(custom.trim()) && custom.trim() < today;

  return (
    <ScrollView style={webScrollFix} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AppText variant="label" tone="secondary" style={styles.label}>
        Compare from
      </AppText>
      <View style={styles.chips}>
        {presets.map((p) => (
          <Chip key={p.label} label={p.label} selected={from === p.date} onPress={() => setFrom(p.date)} />
        ))}
      </View>
      <TextField
        label="Or a date (YYYY-MM-DD)"
        value={custom}
        onChangeText={setCustom}
        placeholder="2026-05-17"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => customValid && setFrom(custom.trim())}
        onBlur={() => customValid && setFrom(custom.trim())}
        error={custom.trim() && !customValid ? 'Use a past date like 2026-05-17' : undefined}
      />
      <AppText variant="subheading" style={styles.heading}>
        {`${longDateLabel(from)} to today`}
      </AppText>

      {!result ? (
        loadError ? (
          <ErrorState message={loadError} onRetry={() => void load()} />
        ) : (
          <LoadingState />
        )
      ) : result.rows.length === 0 ? (
        <EmptyState icon="git-compare-outline" title="Nothing to compare yet" message="Log weights, measurements and workouts to compare them over time." />
      ) : (
        (['body', 'lift'] as const).map((kind) => {
          const rows = result.rows.filter((r) => r.kind === kind);
          if (rows.length === 0) return null;
          return (
            <View key={kind}>
              <SectionHeader title={kind === 'body' ? 'Body' : 'Exercises'} />
              {kind === 'lift' ? (
                <AppText variant="caption" tone="secondary" style={styles.caption}>
                  Each value is the best in the 30 days up to that date.
                </AppText>
              ) : null}
              <Card style={styles.table}>
                <View style={styles.row}>
                  <View style={styles.flex} />
                  <AppText variant="caption" tone="secondary" style={styles.col}>{shortDayMonth(result.from)}</AppText>
                  <AppText variant="caption" tone="secondary" style={styles.col}>Now</AppText>
                </View>
                {rows.map((r) => {
                  const t = rowText(r, unit);
                  return (
                    <View key={r.key} style={[styles.row, styles.divider]}>
                      <View style={styles.flex}>
                        <AppText variant="label" numberOfLines={1}>{t.label}</AppText>
                        {t.change ? (
                          <AppText variant="caption" tone="secondary">{t.change}</AppText>
                        ) : null}
                      </View>
                      <AppText tone="secondary" style={styles.col}>{t.from}</AppText>
                      <AppText variant="label" style={styles.col}>{t.to}</AppText>
                    </View>
                  );
                })}
              </Card>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    label: { marginBottom: Spacing.small - 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap' },
    heading: { marginTop: Spacing.small },
    caption: { marginTop: -Spacing.xs, marginBottom: Spacing.small },
    table: { paddingVertical: Spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.small + 2, gap: Spacing.small },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    flex: { flex: 1, minWidth: 0 },
    col: { width: 84, textAlign: 'right', fontVariant: ['tabular-nums'] },
  });
