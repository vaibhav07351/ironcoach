import { http } from './http';

/** Attended dates (YYYY-MM-DD) between from and to, newest first. */
export async function listAttendance(traineeId: string, from?: string, to?: string): Promise<string[]> {
  const res = await http.get<{ dates: string[] | null }>(`/attendance/${encodeURIComponent(traineeId)}`, {
    query: { from, to, limit: 400 },
  });
  return res.dates ?? [];
}

/** Marks the client as attended on a day. Marking twice is harmless. */
export function markAttended(traineeId: string, date: string): Promise<void> {
  return http.put<void>(`/attendance/${encodeURIComponent(traineeId)}/${encodeURIComponent(date)}`);
}

/** Removes attendance for a day. */
export function unmarkAttended(traineeId: string, date: string): Promise<void> {
  return http.delete<void>(`/attendance/${encodeURIComponent(traineeId)}/${encodeURIComponent(date)}`);
}
