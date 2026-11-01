import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion, Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

export type SectionOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: SectionOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

type Slot = { x: number; width: number };

/**
 * Switches between the sections of one screen. A pill slides to the selected tab and the row
 * scrolls it into view, so the user always sees where they are.
 */
export function SectionTabs<T extends string>({ options, value, onChange }: Props<T>): React.JSX.Element {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [slots, setSlots] = useState<Partial<Record<T, Slot>>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    const slot = slots[value];
    if (!slot) {
      return;
    }
    if (!placed.current || reduceMotion) {
      // First placement jumps; later changes glide.
      x.value = slot.x;
      width.value = slot.width;
      placed.current = true;
    } else {
      x.value = withSpring(slot.x, Motion.standard);
      width.value = withSpring(slot.width, Motion.standard);
    }
    scrollRef.current?.scrollTo({ x: Math.max(0, slot.x - Spacing.large), animated: !reduceMotion });
  }, [slots, value, x, width, reduceMotion]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: width.value }));

  const onSlotLayout = (key: T) => (e: LayoutChangeEvent) => {
    const { x: lx, width: lw } = e.nativeEvent.layout;
    setSlots((prev) => (prev[key]?.x === lx && prev[key]?.width === lw ? prev : { ...prev, [key]: { x: lx, width: lw } }));
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        <Animated.View style={[styles.indicator, indicator]} />
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onLayout={onSlotLayout(o.value)}
              onPress={() => {
                if (!selected) {
                  haptic('select');
                  onChange(o.value);
                }
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={styles.tab}
            >
              <AppText variant="label" style={{ color: selected ? colors.onTint : colors.textSecondary }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    row: {
      paddingHorizontal: Spacing.medium,
      paddingVertical: Spacing.small,
    },
    indicator: {
      position: 'absolute',
      left: 0,
      top: Spacing.small,
      height: 38,
      borderRadius: Radii.pill,
      backgroundColor: colors.tint,
    },
    tab: {
      height: 38,
      paddingHorizontal: Spacing.medium,
      justifyContent: 'center',
      borderRadius: Radii.pill,
    },
  });
