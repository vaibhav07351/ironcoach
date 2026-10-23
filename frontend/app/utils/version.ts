/**
 * Compares dotted version strings numerically ("1.10.0" > "1.9.2").
 * Returns -1, 0 or 1. Missing or non-numeric parts count as 0.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((p) => parseInt(p, 10) || 0);
  const pb = b.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** True when the installed version is older than the minimum the server supports. */
export function isUpdateRequired(installed: string, minSupported: string): boolean {
  return compareVersions(installed, minSupported) < 0;
}
