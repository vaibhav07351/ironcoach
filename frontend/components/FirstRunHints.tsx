import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radii, Spacing } from '@/constants/theme';

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

export default function FirstRunHints({
  storageKey,
  steps,
  visible,
  onDismiss,
  onPrimary,
  primaryLabel,
}: Props): React.JSX.Element | null {
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
    } catch {
      // ignore storage failures — still dismiss for this session
    }
    onDismiss();
  };

  const onSkip = (): void => {
    void finish();
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
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={styles.backdrop} onPress={onSkip}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.eyebrow}>
            Quick tip {step + 1} of {steps.length}
          </Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.dots}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onSkip} hitSlop={12}>
              <Text style={styles.skip}>Skip tips</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
              <Text style={styles.nextText}>{cta}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export async function hasCompletedFirstRunHints(
  storageKey: string
): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(storageKey);
    return v === '1';
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 27, 0.55)',
    justifyContent: 'flex-end',
    padding: Spacing.large,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.large,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eyebrow: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.small,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.small,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.large,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.large,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.large,
    paddingVertical: 12,
    borderRadius: Radii.md,
  },
  nextText: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
});
