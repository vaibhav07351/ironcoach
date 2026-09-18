import { AuthResponse, Invite } from '../types/auth';
import { apiFetch, parseApiError } from './api';

export async function createInvite(
  token: string,
  traineeId: string
): Promise<Invite> {
  const response = await apiFetch(
    '/invites',
    {
      method: 'POST',
      body: JSON.stringify({ trainee_id: traineeId }),
    },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as Invite;
}

export async function redeemInvite(
  token: string,
  code: string
): Promise<AuthResponse> {
  const response = await apiFetch(
    '/invites/redeem',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    token
  );
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as AuthResponse;
}
