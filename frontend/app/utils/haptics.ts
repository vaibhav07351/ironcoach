import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticKind = 'tap' | 'select' | 'success' | 'warning' | 'error';

/**
 * Touch feedback for meaningful moments only (a commit, a toggle, a result), fired on the same
 * frame as the visual change. No-op on web. A failure only loses the vibration, so it is logged.
 */
export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') {
    return;
  }
  const run = (): Promise<void> => {
    switch (kind) {
      case 'tap':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'select':
        return Haptics.selectionAsync();
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run().catch((e: unknown) => {
    console.warn('haptic failed', kind, e instanceof Error ? e.message : String(e));
  });
}
