import type { AppVersionConfig } from '../types/auth';
import { http } from './http';

/** Permanently deletes the signed-in account and its data. */
export function deleteAccount(): Promise<void> {
  return http.delete<void>('/me', { confirm: 'DELETE' });
}

/** Unlinks the signed-in client from their coach. */
export function leaveCoach(): Promise<void> {
  return http.post<void>('/me/leave-coach');
}

/** Supported app versions, for the "please update" gate. Public. */
export function fetchAppVersionConfig(): Promise<AppVersionConfig> {
  return http.get<AppVersionConfig>('/config', { anonymous: true, timeoutMs: 8000 });
}
