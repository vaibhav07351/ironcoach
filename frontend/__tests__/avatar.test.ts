import { colorIndexFor, initialsOf } from '../app/utils/avatar';

describe('avatar helpers', () => {
  it('takes the first and last initials', () => {
    expect(initialsOf('Rahul Sharma')).toBe('RS');
    expect(initialsOf('  priya  ')).toBe('P');
    expect(initialsOf('Aman Kumar Verma')).toBe('AV');
  });

  it('falls back for empty names', () => {
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(undefined)).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });

  it('handles non-Latin and emoji names without splitting characters', () => {
    expect(initialsOf('राहुल शर्मा')).toBe('रश');
    expect(initialsOf('\u{1F600} Smile')).toBe('\u{1F600}S');
  });

  it('gives a stable color index in range, ignoring case and spacing', () => {
    const a = colorIndexFor('Rahul Sharma', 6);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(6);
    expect(colorIndexFor(' rahul sharma ', 6)).toBe(a);
    expect(colorIndexFor('', 6)).toBe(0);
    expect(colorIndexFor('x', 0)).toBe(0);
  });
});
