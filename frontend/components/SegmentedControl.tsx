import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

export type SegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** A few equal-width choices in one row; a pill slides to the selected one. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: Props<T>): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const x = useSharedValue(0);
  const placed = useRef(false);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  useEffect(() => {
    if (segmentWidth === 0) {
      return;
    }
    const target = index * segmentWidth;
    if (!placed.current || reduceMotion) {
      // First placement jumps; later changes glide.
      x.value = target;
      placed.current = true;
    } else {
      x.value = withSpring(target, Motion.standard);
    }
  }, [index, segmentWidth, reduceMotion, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onLayout = (e: LayoutChangeEvent): void => {
    const inner = e.nativeEvent.layout.width - TRACK_PADDING * 2;
    setSegmentWidth(inner / Math.max(1, options.length));
  };

  return (
    <View style={[styles.track, style]} onLayout={onLayout} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {segmentWidth > 0 ? <Animated.View style={[styles.indicator, { width: segmentWidth }, indicator]} /> : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (!selected) {
                haptic('select');
                onChange(o.value);
              }
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={styles.segment}
          >
            <AppText variant="label" numberOfLines={1} style={{ color: selected ? colors.text : colors.textSecondary }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const TRACK_PADDING = 3;

const makeStyles = ({ colors, elevation, scheme }: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: TRACK_PADDING,
      borderRadius: Radii.md,
      backgroundColor: colors.surfaceMuted,
    },
    indicator: {
      position: 'absolute',
      top: TRACK_PADDING,
      bottom: TRACK_PADDING,
      left: TRACK_PADDING,
      borderRadius: Radii.md - TRACK_PADDING,
      // A raised pill reads lighter than its track; in dark the surface color is darker, not lighter.
      backgroundColor: scheme === 'dark' ? colors.border : colors.surface,
      ...(scheme === 'dark' ? {} : elevation(1)),
    },
    segment: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.small,
    },
  });
