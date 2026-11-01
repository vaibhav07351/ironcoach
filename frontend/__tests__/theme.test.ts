import { avatarColors, palettes, type ColorScheme, type Palette } from '../constants/theme';

/** WCAG relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Foreground on background pairs the UI actually draws, with the minimum ratio each needs. */
const PAIRS: [keyof Palette, keyof Palette, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['textSecondary', 'bg', 4.5],
  ['textSecondary', 'surface', 4.5],
  ['textMuted', 'bg', 4.5],
  ['textMuted', 'surface', 4.5],
  ['tint', 'surface', 4.5],
  ['tint', 'bg', 4.5],
  ['onTint', 'tint', 4.5],
  ['onAccent', 'accent', 4.5],
  ['onBrand', 'brand', 4.5],
  ['onBrandMuted', 'brand', 4.5],
  ['danger', 'surface', 4.5],
  ['onDanger', 'danger', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['text', 'surfaceMuted', 4.5],
  ['textSecondary', 'surfaceMuted', 4.5],
];

const isSolid = (c: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(c);

describe.each<ColorScheme>(['light', 'dark'])('%s palette', (scheme) => {
  const p = palettes[scheme];

  it.each(PAIRS)('%s on %s meets WCAG AA', (fg, bg, min) => {
    expect(isSolid(p[fg])).toBe(true);
    expect(isSolid(p[bg])).toBe(true);
    expect(contrast(p[fg], p[bg])).toBeGreaterThanOrEqual(min);
  });

  it('keeps avatar initials readable on their background', () => {
    for (const [bg, fg] of avatarColors[scheme]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
