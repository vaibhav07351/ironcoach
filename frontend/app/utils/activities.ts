import type { ActivityCount } from '../types/workout';

/** A suggestion needs this many logged days (in the mix window) outside the client's list. */
export const SUGGEST_AFTER_DAYS = 3;

export type ResolvedActivities = {
  /** Shown as big log buttons, in order. */
  primary: string[];
  /** An activity logged often but not in the list, worth offering to add. */
  suggestion: string | null;
  /** True when `primary` came from the client's saved list (not a fallback). */
  fromList: boolean;
};

/**
 * Picks what to show first when logging: the client's saved activities; without any, what they
 * actually logged recently (most days first); without that, gym. `known` limits codes to the ones
 * the app can log.
 */
export function resolveActivities(
  saved: readonly string[] | null | undefined,
  mix: readonly ActivityCount[],
  known: readonly string[]
): ResolvedActivities {
  const isKnown = (c: string): boolean => known.includes(c);
  const list = (saved ?? []).filter(isKnown);
  if (list.length > 0) {
    const suggestion = mix.find((m) => m.days >= SUGGEST_AFTER_DAYS && isKnown(m.activity_type) && !list.includes(m.activity_type));
    return { primary: list, suggestion: suggestion?.activity_type ?? null, fromList: true };
  }
  const logged = [...mix]
    .filter((m) => m.days > 0 && isKnown(m.activity_type))
    .sort((a, b) => b.days - a.days)
    .map((m) => m.activity_type);
  return { primary: logged.length > 0 ? logged.slice(0, 3) : ['gym'], suggestion: null, fromList: false };
}
