import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadThemePreference, parseThemePreference, saveThemePreference } from '../app/services/themePreferenceStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('parseThemePreference', () => {
  it.each(['light', 'dark', 'system'] as const)('keeps a saved %s', (saved) => {
    expect(parseThemePreference(saved)).toBe(saved);
  });

  it.each([null, '', 'Dark', 'auto'])('falls back to light for %p', (raw) => {
    expect(parseThemePreference(raw)).toBe('light');
  });
});

describe('theme preference store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to light when nothing is saved', async () => {
    await expect(loadThemePreference()).resolves.toBe('light');
  });

  it('loads what was saved', async () => {
    await saveThemePreference('dark');
    await expect(loadThemePreference()).resolves.toBe('dark');
  });

  it('falls back to light when storage cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    await expect(loadThemePreference()).resolves.toBe('light');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
