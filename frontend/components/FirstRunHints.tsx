import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Radii, Spacing } from '@/constants/theme';
import { useThemedStyles, type Theme } from '../app/contexts/ThemeContext';
import { AppText } from './AppText';
import { Button } from './Button';

export type FirstRunHintStep = {
  title: string;
  body: string;
};

type Props = {
  storageKey: string;
  steps: FirstRunHintStep[];
  visible: boolean;
  onDismiss: () => void;
  onPrimary: (stepIndex: number) => void;
  primaryLabel?: (stepIndex: number, isLast: boolean) => string;
};

/** A few one-time tips in a sheet at the bottom of the screen. Tapping outside skips them. */
export default function FirstRunHints({
  storageKey,
  steps,
  visible,
  onDismiss,
  onPrimary,
  primaryLabel,
}: Props): React.JSX.Element | null {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const isLast = step >= steps.length - 1;
  const current = steps[step];

  const cta = useMemo(() => {
    if (primaryLabel) {
      return primaryLabel(step, isLast);
    }
    return isLast ? 'Got it' : 'Next';
  }, [primaryLabel, step, isLast]);

  if (!visible || !current) {
    return null;
  }

  const finish = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(storageKey, '1');
    } catch (e: unknown) {
      // Still dismiss for this session; the tips may show once more next launch.
      console.warn('first run hints not saved', storageKey, e instanceof Error ? e.message : String(e));
    }
    onDismiss();
  };

  const onNext = (): void => {
    onPrimary(step);
    if (isLast) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => void finish()}>
      <Pressable style={styles.backdrop} onPress={() => void finish()} accessibilityLabel="Skip tips">
        <Pressable
          style={[styles.sheet, { paddingBottom: Spacing.large + insets.bottom }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.dots} accessibilityLabel={`Tip ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === step ? styles.dotActive : null]} />
            ))}
          </View>
          <AppText variant="title" style={styles.title}>
            {current.title}
          </AppText>
          <AppText tone="secondary" style={styles.body}>
            {current.body}
          </AppText>
          <Button title={cta} onPress={onNext} />
          {!isLast ? <Button title="Skip tips" variant="ghost" onPress={() => void finish()} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export async function hasCompletedFirstRunHints(storageKey: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey)) === '1';
  } catch (e: unknown) {
    console.warn('first run hints state not read', storageKey, e instanceof Error ? e.message : String(e));
    return false;
  }
}

const makeStyles = ({ colors, elevation }: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: Radii.xl,
      borderTopRightRadius: Radii.xl,
      paddingHorizontal: Spacing.large,
      paddingTop: Spacing.large,
      gap: Spacing.xs,
      ...elevation(3),
    },
    dots: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: Spacing.medium,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.tint,
      width: 22,
    },
    title: {
      marginBottom: Spacing.small,
    },
    body: {
      marginBottom: Spacing.large,
    },
  });
