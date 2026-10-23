import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

import { shouldAskForReview } from '../utils/review';

/**
 * Asks for a Play Store review once, at a success moment (see shouldAskForReview). A failure here
 * must never get in the way of the screen, so it is logged and otherwise ignored.
 */
export function useReviewPrompt(userId: string | undefined): (stats: { workoutCount: number; trainedToday: boolean }) => Promise<void> {
  return useCallback(
    async ({ workoutCount, trainedToday }) => {
      if (!userId) {
        return;
      }
      const key = `review_asked_v1_${userId}`;
      try {
        const alreadyAsked = (await AsyncStorage.getItem(key)) === '1';
        if (!shouldAskForReview({ workoutCount, trainedToday, alreadyAsked })) {
          return;
        }
        if (!(await StoreReview.isAvailableAsync())) {
          return;
        }
        // Mark first: if the prompt is shown but the app is killed, it must not ask again.
        await AsyncStorage.setItem(key, '1');
        await StoreReview.requestReview();
      } catch (e: unknown) {
        console.warn('review prompt skipped', e instanceof Error ? e.message : String(e));
      }
    },
    [userId]
  );
}
