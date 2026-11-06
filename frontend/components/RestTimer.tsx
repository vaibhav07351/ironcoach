import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { formatDuration } from '../app/utils/exerciseFormat';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props = {
  /** When the rest ends (ms since epoch), or null when no timer runs. */
  endsAt: number | null;
  onChange: (endsAt: number | null) => void;
};

/**
 * Rest countdown shown after a set is saved. Counts from a fixed end time (not by ticking down a
 * number), so it stays right if the app is paused. Buzzes once at the end. In-app only.
 */
export function RestTimer({ endsAt, onChange }: Props): React.JSX.Element | null {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    buzzed.current = false;
    if (endsAt === null) return undefined;
    const tick = (): void => setNow(Date.now());
    // First tick right away (from a timer callback), then four times a second.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [endsAt]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  const done = endsAt !== null && remaining === 0;

  useEffect(() => {
    if (done && !buzzed.current) {
      buzzed.current = true;
      haptic('success');
    }
  }, [done]);

  if (endsAt === null) return null;

  const adjust = (deltaSeconds: number): void => {
    const base = Math.max(endsAt, Date.now());
    onChange(Math.max(Date.now(), base + deltaSeconds * 1000));
  };

  return (
    <View style={[styles.bar, done ? styles.done : null]} accessibilityLiveRegion="polite">
      <Ionicons name={done ? 'notifications' : 'timer-outline'} size={22} color={done ? colors.onAccent : colors.tint} />
      <AppText variant="subheading" style={[styles.time, done ? { color: colors.onAccent } : null]}>
        {done ? 'Rest over, next set' : `Rest ${formatDuration(remaining)}`}
      </AppText>
      {!done ? (
        <>
          <PressableScale onPress={() => adjust(-15)} accessibilityRole="button" accessibilityLabel="15 seconds less rest" style={styles.chip}>
            <AppText variant="label">-15</AppText>
          </PressableScale>
          <PressableScale onPress={() => adjust(15)} accessibilityRole="button" accessibilityLabel="15 seconds more rest" style={styles.chip}>
            <AppText variant="label">+15</AppText>
          </PressableScale>
        </>
      ) : null}
      <PressableScale
        onPress={() => onChange(null)}
        accessibilityRole="button"
        accessibilityLabel={done ? 'Dismiss rest timer' : 'Skip rest'}
        style={styles.close}
      >
        <Ionicons name="close" size={20} color={done ? colors.onAccent : colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.small,
      backgroundColor: colors.tintSoft,
      borderRadius: Radii.lg,
      paddingVertical: Spacing.small,
      paddingHorizontal: Spacing.small + 4,
      marginBottom: Spacing.medium,
    },
    done: { backgroundColor: colors.accent },
    time: { flex: 1, fontVariant: ['tabular-nums'] },
    chip: {
      minWidth: 48,
      minHeight: 40,
      borderRadius: Radii.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.small,
    },
    close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  });
