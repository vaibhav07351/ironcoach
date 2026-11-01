import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme, type ViewStyle } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import {
  DEFAULT_THEME_PREFERENCE,
  elevation,
  palettes,
  typeScale,
  type ColorScheme,
  type ElevationLevel,
  type Palette,
  type ThemePreference,
  type TypeScale,
} from '@/constants/theme';
import { saveThemePreference } from '../services/themePreferenceStore';
import { applyWebColorScheme } from '../utils/webColorScheme';

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  type: TypeScale;
  elevation: (level: ElevationLevel) => ViewStyle;
};

function buildTheme(scheme: ColorScheme, brandFont: boolean): Theme {
  const colors = palettes[scheme];
  const levels: Record<ElevationLevel, ViewStyle> = {
    0: elevation(scheme, 0, colors),
    1: elevation(scheme, 1, colors),
    2: elevation(scheme, 2, colors),
    3: elevation(scheme, 3, colors),
  };
  return { scheme, colors, type: typeScale(brandFont), elevation: (level) => levels[level] };
}

// Four possible themes, built once, so identity is stable and style caches stay valid.
const themes: Record<`${ColorScheme}-${boolean}`, Theme> = {
  'light-true': buildTheme('light', true),
  'light-false': buildTheme('light', false),
  'dark-true': buildTheme('dark', true),
  'dark-false': buildTheme('dark', false),
};

const ThemeContext = createContext<Theme>(themes['light-false']);

type PreferenceState = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const PreferenceContext = createContext<PreferenceState>({
  preference: DEFAULT_THEME_PREFERENCE,
  setPreference: () => undefined,
});

type Props = {
  children: ReactNode;
  /** True once the brand font has loaded; until then (or if it fails) the system font is used. */
  brandFont: boolean;
  /** The saved choice, read before the splash hides so the first frame has the right theme. */
  initialPreference: ThemePreference;
};

/** Light unless the user picked Dark, or System and the phone is dark. */
export function ThemeProvider({ children, brandFont, initialPreference }: Props): React.JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const theme = themes[`${scheme}-${brandFont}`];

  const preferenceState = useMemo<PreferenceState>(
    () => ({
      preference,
      setPreference: (next) => {
        // Switch now; if saving fails the choice still holds until the app restarts.
        setPreferenceState(next);
        saveThemePreference(next).catch((e: unknown) => {
          console.warn('theme preference not saved', e instanceof Error ? e.message : String(e));
        });
      },
    }),
    [preference]
  );

  useEffect(() => {
    // Native alerts and the keyboard follow the app's choice, not the phone's. Web has no override.
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
  }, [preference]);

  useEffect(() => {
    applyWebColorScheme(scheme, theme.colors.bg);
  }, [scheme, theme]);

  useEffect(() => {
    // Root view color shows behind screens during transitions and under the Android nav bar.
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch((e: unknown) => {
      console.warn('system ui background not set', e instanceof Error ? e.message : String(e));
    });
  }, [theme]);

  return (
    <PreferenceContext.Provider value={preferenceState}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </PreferenceContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** The Light / Dark / System choice and its setter (Account > Appearance). */
export function useThemePreference(): PreferenceState {
  return useContext(PreferenceContext);
}

const styleCache = new WeakMap<object, { theme: Theme; styles: unknown }>();

/**
 * Styles that depend on the theme. Pass a factory declared at module level; its result is built
 * once per theme and shared by every component instance (list rows do not rebuild styles).
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => {
    const hit = styleCache.get(factory);
    if (hit && hit.theme === theme) {
      return hit.styles as T;
    }
    const styles = factory(theme);
    styleCache.set(factory, { theme, styles });
    return styles;
  }, [factory, theme]);
}
