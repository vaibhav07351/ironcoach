import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../app/contexts/ThemeContext';
import { haptic } from '../app/utils/haptics';
import { AppText } from './AppText';

type Props = {
  value: number;
  onChange?: (score: number) => void;
  readonly?: boolean;
  size?: number;
  color?: string;
  showValue?: boolean;
};

/**
 * 5-star control with half-star steps (0.5 ... 5.0).
 * Tap left half of a star for *.5, right half for full.
 */
export function StarRating({ value, onChange, readonly = false, size = 28, color, showValue = false }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const starColor = color ?? colors.accent;
  const clamped = Math.max(0, Math.min(5, value || 0));

  const starIcon = (index: number): 'star' | 'star-half' | 'star-outline' => {
    const starNumber = index + 1;
    if (clamped >= starNumber) {
      return 'star';
    }
    if (clamped >= starNumber - 0.5) {
      return 'star-half';
    }
    return 'star-outline';
  };

  const handlePress = (starIndex: number, half: 'left' | 'right'): void => {
    if (readonly || !onChange) {
      return;
    }
    haptic('select');
    onChange(half === 'left' ? starIndex + 0.5 : starIndex + 1);
  };

  return (
    <View
      style={styles.row}
      accessible={readonly}
      accessibilityLabel={readonly ? `${clamped.toFixed(1)} out of 5 stars` : undefined}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.starWrap, { width: size, height: size }]}>
          <Ionicons name={starIcon(i)} size={size} color={starColor} />
          {!readonly && (
            <View style={styles.hitRow}>
              <Pressable
                style={styles.hitHalf}
                onPress={() => handlePress(i, 'left')}
                accessibilityRole="button"
                accessibilityLabel={`${i + 0.5} stars`}
              />
              <Pressable
                style={styles.hitHalf}
                onPress={() => handlePress(i, 'right')}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1} stars`}
              />
            </View>
          )}
        </View>
      ))}
      {showValue && clamped > 0 ? (
        <AppText variant="label" style={styles.valueText}>
          {clamped.toFixed(1)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starWrap: {
    position: 'relative',
  },
  hitRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  hitHalf: {
    flex: 1,
  },
  valueText: {
    marginLeft: 6,
    fontWeight: '700',
  },
});
