import { compareVersions, isUpdateRequired } from '../app/utils/version';

describe('version compare', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBe(1);
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1);
    expect(compareVersions('2', '1.9.9')).toBe(1);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
  });

  it('flags only builds older than the minimum', () => {
    expect(isUpdateRequired('1.0.0', '1.1.0')).toBe(true);
    expect(isUpdateRequired('1.1.0', '1.1.0')).toBe(false);
    expect(isUpdateRequired('1.2.0', '1.1.0')).toBe(false);
  });
});
