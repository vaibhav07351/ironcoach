import { useCallback, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/*
 * Screens with a navy top need light status bar icons. Each focused screen registers a request,
 * and one <StatusBar> at the root renders from the count, so there is a single owner of the style
 * and no race between screens setting it imperatively.
 */
let lightRequests = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Light status bar icons while this screen is focused. */
export function useLightStatusBar(): void {
  useFocusEffect(
    useCallback(() => {
      lightRequests += 1;
      emit();
      return () => {
        lightRequests -= 1;
        emit();
      };
    }, [])
  );
}

/** True while any focused screen wants light status bar icons. */
export function useWantsLightStatusBar(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => lightRequests > 0,
    () => false
  );
}
