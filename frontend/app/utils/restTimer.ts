import AsyncStorage from '@react-native-async-storage/async-storage';

/** Rest timer choices in seconds; 0 turns the timer off for that exercise. */
export const REST_CHOICES = [0, 60, 90, 120, 180] as const;
export const DEFAULT_REST_SECONDS = 90;

const key = (exerciseId: string): string => `ironcoach.rest.${exerciseId}`;

/** The rest time chosen for an exercise on this device (default 90 s). */
export async function loadRestSeconds(exerciseId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key(exerciseId));
    const n = raw === null ? DEFAULT_REST_SECONDS : Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 600 ? n : DEFAULT_REST_SECONDS;
  } catch (e) {
    console.warn('rest time not read, using default', e instanceof Error ? e.message : String(e));
    return DEFAULT_REST_SECONDS;
  }
}

export async function saveRestSeconds(exerciseId: string, seconds: number): Promise<void> {
  await AsyncStorage.setItem(key(exerciseId), String(seconds));
}

/** The next choice in REST_CHOICES after `current` (wraps around). */
export function nextRestChoice(current: number): number {
  const i = REST_CHOICES.indexOf(current as (typeof REST_CHOICES)[number]);
  return REST_CHOICES[(i + 1) % REST_CHOICES.length];
}
