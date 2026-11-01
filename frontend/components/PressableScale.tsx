import React, { type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';
import { haptic as fireHaptic, type HapticKind } from '../app/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while held (1 = none). */
  scaleTo?: number;
  /** Touch feedback fired with the press. */
  haptic?: HapticKind;
};

/**
 * The app's press primitive: shrinks slightly the instant a finger lands (feedback on touch-down,
 * not release) and springs back, interruptibly. With Reduce Motion on it dims instead of scaling.
 */
export function PressableScale({
  children,
  style,
  scaleTo = Motion.pressScale,
  haptic,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: Props): React.JSX.Element {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.25 }
      : { transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }] }
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        pressed.value = withSpring(1, Motion.press);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        pressed.value = withSpring(0, Motion.press);
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) {
          fireHaptic(haptic);
        }
        onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
