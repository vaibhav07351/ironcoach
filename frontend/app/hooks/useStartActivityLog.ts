import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { errorMessage } from '../services/http';
import { listCategories } from '../services/workoutService';
import type { RootStackParamList } from '../types/navigation';

/**
 * Opens the right logging flow for an activity: gym -> categories, cardio -> straight into the
 * Cardio category's exercises, anything else -> the short sport session form.
 */
export function useStartActivityLog(traineeId: string): (code: string, date: string) => Promise<void> {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return useCallback(
    async (code: string, date: string) => {
      if (code === 'gym') {
        navigation.navigate('WorkoutCategories', { traineeId, date });
        return;
      }
      if (code !== 'cardio') {
        navigation.navigate('LogSession', { traineeId, date, activityType: code });
        return;
      }
      try {
        const categories = await listCategories(traineeId);
        const cardio = categories.find((c) => c.name.trim().toLowerCase() === 'cardio');
        if (cardio) {
          navigation.navigate('WorkoutExercises', { traineeId, categoryId: cardio.id, categoryName: cardio.name, date });
        } else {
          navigation.navigate('WorkoutCategories', { traineeId, date });
        }
      } catch (e: unknown) {
        Toast.show({ type: 'error', text1: 'Could not open cardio', text2: errorMessage(e) });
      }
    },
    [navigation, traineeId]
  );
}
