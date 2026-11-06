import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import type { DatedValue } from '../app/types/progress';
import { shortDayMonth, weekdayDateLabel } from '../app/utils/date';
import { AppText } from './AppText';

type Props = {
  points: DatedValue[];
  /** Full value text for the detail line, e.g. "126.7 kg". */
  format: (value: number) => string;
  /** Multiplier for the plotted value (e.g. metres to km) so axis labels stay short. */
  scale?: number;
  decimals?: number;
  emptyText: string;
};

const CHART_HEIGHT = 220;
const MAX_X_LABELS = 3;

/** A line chart of dated values. Tapping a point shows its date and value under the chart. */
export function MetricChart({ points, format, scale = 1, decimals = 1, emptyText }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  // A tapped point belongs to the data it was tapped on; new data starts with nothing selected.
  const [tapped, setTapped] = useState<{ points: DatedValue[]; index: number } | null>(null);
  const selected = tapped && tapped.points === points ? tapped.index : null;

  const labels = useMemo(() => {
    // Only a few dates on the axis (at 0, 1/3 and 2/3), so the last label is never cut off at the
    // right edge; the rest stay blank.
    const n = points.length;
    const show = new Set(Array.from({ length: Math.min(MAX_X_LABELS, n) }, (_, i) => Math.floor((i * n) / MAX_X_LABELS)));
    return points.map((p, i) => (show.has(i) ? shortDayMonth(p.date) : ''));
  }, [points]);

  if (points.length === 0) {
    return (
      <View style={styles.empty}>
        <AppText tone="secondary" center>
          {emptyText}
        </AppText>
      </View>
    );
  }

  const shown = selected !== null ? points[selected] : points[points.length - 1];

  return (
    <View>
      <View style={styles.box} onLayout={(e) => setWidth(Math.floor(e.nativeEvent.layout.width))}>
        {width > 0 && points.length >= 2 ? (
          <LineChart
            data={{ labels, datasets: [{ data: points.map((p) => p.value * scale), color: () => colors.tint, strokeWidth: 2.5 }] }}
            width={width}
            height={CHART_HEIGHT}
            withInnerLines
            withOuterLines={false}
            withVerticalLines={false}
            fromZero={false}
            onDataPointClick={({ index }) => setTapped({ points, index })}
            chartConfig={{
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              fillShadowGradientFrom: colors.tint,
              fillShadowGradientFromOpacity: 0.18,
              fillShadowGradientTo: colors.tint,
              fillShadowGradientToOpacity: 0.02,
              decimalPlaces: decimals,
              color: (opacity = 1) => (opacity < 1 ? colors.separator : colors.tint),
              labelColor: () => colors.textMuted,
              propsForDots: { r: points.length > 40 ? '2' : '4', strokeWidth: '2', stroke: colors.surface },
              propsForBackgroundLines: { stroke: colors.separator, strokeDasharray: '' },
            }}
            style={styles.chart}
          />
        ) : null}
      </View>
      <View style={styles.detail} accessibilityLiveRegion="polite">
        <AppText variant="subheading" style={styles.value}>
          {format(shown.value)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {selected !== null ? weekdayDateLabel(shown.date) : `Latest, ${weekdayDateLabel(shown.date)}. Tap a point for details.`}
        </AppText>
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    box: { marginHorizontal: -Spacing.small },
    chart: { marginLeft: -Spacing.small, borderRadius: Radii.md },
    detail: {
      marginTop: Spacing.small,
      paddingTop: Spacing.small,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    value: { fontVariant: ['tabular-nums'] },
    empty: { paddingVertical: Spacing.xl },
  });
