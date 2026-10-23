import type { AuthResponse, Invite } from '../types/auth';
import { http } from './http';

/** Creates a single-use, 7-day invite code for one of the trainer's clients. */
export function createInvite(traineeId: string): Promise<Invite> {
  return http.post<Invite>('/invites', { trainee_id: traineeId });
}

/** Links the signed-in client to their coach. `shareConsent` must be true. */
export function redeemInvite(code: string, shareConsent: boolean): Promise<AuthResponse> {
  return http.post<AuthResponse>('/invites/redeem', { code: code.trim().toUpperCase(), share_consent: shareConsent });
}
