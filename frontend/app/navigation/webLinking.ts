import { findFocusedRoute, type LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from '../types/navigation';

/** "TraineeDetail" -> "trainee-detail". */
function toPathSegment(routeName: string): string {
  return routeName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Browser history for the web build. Without linking, navigating never adds a browser history
 * entry, so the phone's back button (or the browser back arrow) leaves the site instead of going
 * back a screen. With it, every push or tab switch adds an entry and back steps through the app.
 *
 * The URL names the focused screen only (e.g. /trainee-detail). Params stay out of it: several are
 * objects (a client, a workout log, a food list) that cannot round-trip through a query string, so
 * a reload or a pasted link opens the start screen for the signed-in user, as it did before.
 */
export const webLinking: LinkingOptions<RootStackParamList> = {
  prefixes: [],
  getPathFromState: (state) => {
    const route = findFocusedRoute(state);
    return route ? `/${toPathSegment(route.name)}` : '/';
  },
  getStateFromPath: () => undefined,
};
