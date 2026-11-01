import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from '@/constants/theme';

/**
 * The Light / Dark / System choice, saved on this device. Not a secret, so plain AsyncStorage.
 * A missing, unknown or unreadable value means the default (light).
 */
const PREFERENCE_KEY = 'ironcoach.theme_preference';

export function parseThemePreference(raw: string | null): ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : DEFAULT_THEME_PREFERENCE;
}

export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    return parseThemePreference(await AsyncStorage.getItem(PREFERENCE_KEY));
  } catch (e) {
    console.warn('theme preference not read, using default', e instanceof Error ? e.message : String(e));
    return DEFAULT_THEME_PREFERENCE;
  }
}

export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(PREFERENCE_KEY, preference);
}
