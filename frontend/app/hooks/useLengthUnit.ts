import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LENGTH_UNIT, type LengthUnit } from '../utils/bodyMetrics';

/**
 * Inches or centimetres for body measurements, saved on this device. One shared value for the
 * whole app: changing it in Account (or on the Body tab) updates every screen using the hook.
 */
const KEY = 'ironcoach.length_unit';

let current: LengthUnit = DEFAULT_LENGTH_UNIT;
let loadStarted = false;
const listeners = new Set<() => void>();

export function parseLengthUnit(raw: string | null): LengthUnit {
  return raw === 'cm' || raw === 'in' ? raw : DEFAULT_LENGTH_UNIT;
}

function publish(unit: LengthUnit): void {
  if (unit === current) return;
  current = unit;
  listeners.forEach((l) => l());
}

function loadOnce(): void {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(KEY)
    .then((raw) => publish(parseLengthUnit(raw)))
    .catch((e: unknown) => {
      console.warn('length unit not read, using default', e instanceof Error ? e.message : String(e));
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  loadOnce();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): LengthUnit => current;

/** Saves the unit and updates every screen using it. A failed save keeps it for this session. */
export async function setLengthUnit(unit: LengthUnit): Promise<void> {
  publish(unit);
  await AsyncStorage.setItem(KEY, unit);
}

export function useLengthUnit(): LengthUnit {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
