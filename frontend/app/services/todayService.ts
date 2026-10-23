import type { DuesList, TodayOverview } from '../types/fees';
import { http } from './http';

/** The trainer's Today screen: who trained, who is slipping, requests and dues. */
export function getTodayOverview(): Promise<TodayOverview> {
  return http.get<TodayOverview>('/today');
}

/** Every active client who owes money, largest first. */
export function listDues(limit = 200, offset = 0): Promise<DuesList> {
  return http.get<DuesList>('/dues', { query: { limit, offset } });
}
