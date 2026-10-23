import { Platform } from 'react-native';

/** Design tokens. Light theme only for v1. */
export const Colors = {
  primary: '#0B3D2E',
  primaryMuted: '#1A5C45',
  primarySoft: '#DCEBE3',
  accent: '#E8A838',
  accentSoft: '#F5D59A',
  background: '#F3F0E8',
  backgroundAlt: '#E8E4D9',
  surface: '#FFFFFF',
  textPrimary: '#14201B',
  textSecondary: '#5C6B64',
  textMuted: '#8A958F',
  textOnPrimary: '#F7F4EC',
  error: '#B42318',
  errorSoft: '#FDECEA',
  success: '#1B7A4E',
  warning: '#B54708',
  atRisk: '#C4320A',
  border: '#D6D0C4',
  activeCard: '#D8F0E3',
  inactiveCard: '#F8E0DC',
  overlay: 'rgba(20, 32, 27, 0.4)',
};

export const Fonts = {
  // Georgia does not exist on Android; "serif" maps to the system serif face there.
  display: Platform.select({ android: 'serif', default: 'Georgia' }),
  regular: 'System',
  bold: 'System',
};

/** Type scale: size and line height per role. */
export const Type = {
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
};

export const Spacing = {
  xs: 4,
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
};

export const Radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

/** Minimum touch target (Android guideline 48dp). */
export const TouchTarget = 48;
