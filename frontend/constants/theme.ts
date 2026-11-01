import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Design tokens. Colors are semantic (what a color is for, not what it looks like) and come in a
 * light and a dark palette; screens read the active one through `useTheme()`.
 * Brand: navy (#07173D) and gold (#FDBF27), from the logo and store graphics.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Screen background. */
  bg: string;
  /** Cards, sheets, inputs. */
  surface: string;
  /** Quiet fills: input backgrounds, neutral badges, skeletons. */
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  /** Interactive color: links, icons, selected states (navy in light, gold in dark). */
  tint: string;
  /** Content drawn on top of `tint`. */
  onTint: string;
  tintSoft: string;
  /** Navy hero blocks (home headers, sign in). Same in both schemes, deeper in dark. */
  brand: string;
  onBrand: string;
  onBrandMuted: string;
  /** Translucent tile on top of `brand`. */
  brandRaised: string;
  /** Gold: the single most important action on a screen. */
  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;
  danger: string;
  /** Label on a solid `danger` button. */
  onDanger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  separator: string;
  /** Input and control outlines. */
  border: string;
  overlay: string;
};

const light: Palette = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EBEEF4',
  text: '#0E1526',
  textSecondary: '#4E576B',
  textMuted: '#646C7F',
  tint: '#07173D',
  onTint: '#FFFFFF',
  tintSoft: '#E3E8F4',
  brand: '#07173D',
  onBrand: '#FFFFFF',
  onBrandMuted: '#B8C1D9',
  brandRaised: 'rgba(255, 255, 255, 0.09)',
  accent: '#FDBF27',
  onAccent: '#07173D',
  accentSoft: '#FFF1C7',
  onAccentSoft: '#6B4A00',
  danger: '#C2261A',
  onDanger: '#FFFFFF',
  dangerSoft: '#FDECEA',
  success: '#17784C',
  successSoft: '#DDF3E6',
  warning: '#A64106',
  warningSoft: '#FEF0C7',
  separator: '#E3E6EE',
  border: '#CDD3DF',
  overlay: 'rgba(7, 23, 61, 0.5)',
};

const dark: Palette = {
  bg: '#070D1C',
  surface: '#111A2E',
  surfaceMuted: '#1A2540',
  text: '#F2F4F8',
  textSecondary: '#AEB6C8',
  textMuted: '#8B95AA',
  tint: '#FDBF27',
  onTint: '#07173D',
  tintSoft: 'rgba(253, 191, 39, 0.14)',
  brand: '#0D1D46',
  onBrand: '#FFFFFF',
  onBrandMuted: '#B3BEDA',
  brandRaised: 'rgba(255, 255, 255, 0.08)',
  accent: '#FDBF27',
  onAccent: '#07173D',
  accentSoft: 'rgba(253, 191, 39, 0.16)',
  onAccentSoft: '#FDD573',
  danger: '#FF7A6E',
  onDanger: '#2A0704',
  dangerSoft: 'rgba(255, 122, 110, 0.14)',
  success: '#4CC38A',
  successSoft: 'rgba(76, 195, 138, 0.14)',
  warning: '#F5A524',
  warningSoft: 'rgba(245, 165, 36, 0.14)',
  separator: '#1E2942',
  border: '#2C3956',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Initials avatar colors (background, foreground), picked by a stable hash of the name. */
export const avatarColors: Record<ColorScheme, readonly (readonly [string, string])[]> = {
  light: [
    ['#E3E8F4', '#07173D'],
    ['#FFF1C7', '#6B4A00'],
    ['#DDF3E6', '#0F5A38'],
    ['#FCE4EC', '#8E1D45'],
    ['#E6E1FA', '#43308F'],
    ['#DDEFF7', '#0B5470'],
  ],
  dark: [
    ['#1D2C55', '#C9D3F0'],
    ['#3A2E0C', '#FDD573'],
    ['#123526', '#8DE0B6'],
    ['#3D1626', '#F6A9C3'],
    ['#2A2150', '#C8BDF7'],
    ['#0F3141', '#9ED6EC'],
  ],
};

export const Spacing = {
  xs: 4,
  small: 8,
  medium: 16,
  large: 24,
  xl: 32,
  xxl: 48,
};

export const Radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

/** Minimum touch target (Android guideline 48dp; Apple's is 44pt). */
export const TouchTarget = 48;

/** Plus Jakarta Sans faces, loaded at start-up; the system font is the fallback. */
export const BrandFonts = {
  extraBold: 'PlusJakartaSans_800ExtraBold',
  bold: 'PlusJakartaSans_700Bold',
  semiBold: 'PlusJakartaSans_600SemiBold',
} as const;

export type TypeVariant =
  | 'largeTitle'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'label'
  | 'caption'
  | 'number';

export type TypeScale = Record<TypeVariant, TextStyle>;

/**
 * Brand face for display text with tight negative tracking (Apple: large text wants negative
 * tracking); system font for body text, which reads best at small sizes. A custom face carries its
 * weight in the family name, so fontWeight is only set for the system fallback.
 */
export function typeScale(brandFont: boolean): TypeScale {
  const face = (family: string, weight: TextStyle['fontWeight']): TextStyle =>
    brandFont ? { fontFamily: family } : { fontWeight: weight };
  return {
    largeTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.6, ...face(BrandFonts.extraBold, '800') },
    title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4, ...face(BrandFonts.bold, '700') },
    heading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2, ...face(BrandFonts.bold, '700') },
    subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
    body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
    label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
    caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
    number: {
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.5,
      fontVariant: ['tabular-nums'],
      ...face(BrandFonts.extraBold, '800'),
    },
  };
}

/** Largest text-size multiplier honoured, so the phone's text-size setting never breaks layouts. */
export const MaxFontScale = 1.5;

export type ElevationLevel = 0 | 1 | 2 | 3;

const lightShadows: Record<ElevationLevel, string | undefined> = {
  0: undefined,
  1: '0px 1px 2px rgba(10, 22, 52, 0.06), 0px 2px 8px rgba(10, 22, 52, 0.05)',
  2: '0px 2px 4px rgba(10, 22, 52, 0.06), 0px 8px 20px rgba(10, 22, 52, 0.08)',
  3: '0px 8px 16px rgba(10, 22, 52, 0.1), 0px 20px 40px rgba(10, 22, 52, 0.16)',
};

/**
 * Depth. Light mode uses soft layered shadows; shadows vanish on dark backgrounds, so dark mode
 * separates raised surfaces with a hairline edge instead (and a real shadow only for floating ones).
 */
export function elevation(scheme: ColorScheme, level: ElevationLevel, palette: Palette): ViewStyle {
  if (level === 0) {
    return {};
  }
  if (scheme === 'light') {
    return { boxShadow: lightShadows[level] };
  }
  return {
    borderWidth: 1,
    borderColor: palette.separator,
    ...(level === 3 ? { boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.5)' } : {}),
  };
}

/**
 * Motion. Springs are critically damped by default (no bounce); bounce only follows a gesture that
 * carried momentum. Durations are perceptual settle times in ms.
 */
export const Motion = {
  press: { duration: 200, dampingRatio: 1 },
  standard: { duration: 380, dampingRatio: 1 },
  momentum: { duration: 450, dampingRatio: 0.8 },
  pressScale: 0.97,
  fade: 220,
  /** Delay between items in a staggered entrance. */
  stagger: 60,
} as const;

/** Web needs height 0 next to flex 1 for a ScrollView to scroll. */
export const webScrollFix: ViewStyle = Platform.select({ web: { flex: 1, height: 0 }, default: { flex: 1 } });
