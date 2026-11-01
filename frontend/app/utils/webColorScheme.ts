import { Platform } from 'react-native';

import type { ColorScheme } from '@/constants/theme';

/**
 * Tells the browser which scheme the page is drawn in. Without it, Chrome's "dark theme for web
 * pages" and Samsung Internet's dark mode repaint the light theme dark on a phone set to dark.
 * "only light" opts out of that forced darkening; "dark" also gives dark scrollbars and controls.
 * No-op off web.
 */
export function applyWebColorScheme(scheme: ColorScheme, background: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const value = scheme === 'dark' ? 'dark' : 'only light';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head.appendChild(meta);
  }
  meta.content = value;
  document.documentElement.style.colorScheme = value;
  // The page behind the app (overscroll, before first paint) matches the theme.
  document.documentElement.style.backgroundColor = background;
  document.body.style.backgroundColor = background;
}
