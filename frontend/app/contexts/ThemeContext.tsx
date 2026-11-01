import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme, type ViewStyle } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import {
  elevation,
  palettes,
  typeScale,
  type ColorScheme,
  type ElevationLevel,
  type Palette,
  type TypeScale,
} from '@/constants/theme';

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

type Props = {
  children: ReactNode;
  /** True once the brand font has loaded; until then (or if it fails) the system font is used. */
  brandFont: boolean;
};

/** Follows the phone's light/dark setting. */
export function ThemeProvider({ children, brandFont }: Props): React.JSX.Element {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = themes[`${scheme}-${brandFont}`];

  useEffect(() => {
    // Root view color shows behind screens during transitions and under the Android nav bar.
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch((e: unknown) => {
      console.warn('system ui background not set', e instanceof Error ? e.message : String(e));
    });
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
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
