import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { Radii, Spacing, TouchTarget, webScrollFix } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { useTraineeRecord } from '../app/contexts/TraineeRecordContext';
import { setLengthUnit, useLengthUnit } from '../app/hooks/useLengthUnit';
import { getBodySummary } from '../app/services/bodyService';
import { errorMessage } from '../app/services/http';
import type { BodyMetricSummary } from '../app/types/body';
import type { RootStackParamList } from '../app/types/navigation';
import { bodyMetricLabel, formatBodyChange, formatBodyValue, type LengthUnit } from '../app/utils/bodyMetrics';
import { agoLabel } from '../app/utils/date';
import { AppText } from './AppText';
import { Card } from './Card';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { SegmentedControl } from './SegmentedControl';

const UNITS: { value: LengthUnit; label: string }[] = [
  { value: 'in', label: 'Inches' },
  { value: 'cm', label: 'Centimetres' },
];

/** Body tracker: every measurement with its latest value, when it was taken and the change. */
export function BodyTrackerSection(): React.JSX.Element {
  const record = useTraineeRecord();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const unit = useLengthUnit();
  const [rows, setRows] = useState<BodyMetricSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await getBodySummary(record.id));
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

  const changeUnit = (next: LengthUnit): void => {
    setLengthUnit(next).catch((e: unknown) => {
      Toast.show({ type: 'error', text1: 'Unit not saved on this device', text2: errorMessage(e) });
    });
  };

  if (!rows) return loadError ? <ErrorState message={loadError} onRetry={() => void load()} /> : <LoadingState />;

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
      <SegmentedControl options={UNITS} value={unit} onChange={changeUnit} accessibilityLabel="Measurement unit" style={styles.units} />
      <Card style={styles.card}>
        {rows.map((r, i) => {
          const change = r.latest && r.previous ? formatBodyChange(r.metric, r.previous.value, r.latest.value, unit) : null;
          const up = r.latest && r.previous ? r.latest.value > r.previous.value : false;
          return (
            <Pressable
              key={r.metric}
              onPress={() => navigation.navigate('BodyMetric', { traineeId: record.id, metric: r.metric })}
              accessibilityRole="button"
              accessibilityLabel={`${bodyMetricLabel(r.metric)}: ${r.latest ? `${formatBodyValue(r.metric, r.latest.value, unit)}, ${agoLabel(r.latest.date)}${change ? `, change ${change}` : ''}` : 'not recorded yet'}`}
              style={({ pressed }) => [styles.row, i > 0 ? styles.divider : null, pressed ? styles.pressed : null]}
            >
              <View style={styles.flex}>
                <AppText variant="subheading">{bodyMetricLabel(r.metric)}</AppText>
                <AppText variant="caption" tone="secondary">
                  {r.latest ? agoLabel(r.latest.date) : 'Tap to record a value'}
                </AppText>
              </View>
              {r.latest ? (
                <View style={styles.values}>
                  <AppText variant="subheading" style={styles.num}>
                    {formatBodyValue(r.metric, r.latest.value, unit)}
                  </AppText>
                  {change ? (
                    <View style={styles.change}>
                      <Ionicons name={up ? 'caret-up' : 'caret-down'} size={12} color={colors.textSecondary} />
                      <AppText variant="caption" tone="secondary" style={styles.num}>
                        {change}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Ionicons name="add-circle-outline" size={22} color={colors.tint} />
              )}
            </Pressable>
          );
        })}
      </Card>
    </ScrollView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    content: { padding: Spacing.medium, paddingBottom: Spacing.xxl },
    units: { marginBottom: Spacing.medium },
    card: { paddingVertical: 0, paddingHorizontal: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TouchTarget + 20,
      paddingHorizontal: Spacing.medium,
      paddingVertical: Spacing.small + 2,
      borderRadius: Radii.md,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
    pressed: { backgroundColor: colors.surfaceMuted },
    flex: { flex: 1, minWidth: 0 },
    values: { alignItems: 'flex-end' },
    change: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    num: { fontVariant: ['tabular-nums'] },
  });
