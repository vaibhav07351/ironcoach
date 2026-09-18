import { AuthResponse, PublicUser, UserRole } from '../types/auth';
import { apiFetch, parseApiError } from './api';

export async function googleAuth(
  idToken: string,
  role?: UserRole
): Promise<AuthResponse> {
  const body: { id_token: string; role?: UserRole } = { id_token: idToken };
  if (role) {
    body.role = role;
  }

  const response = await apiFetch('/auth/google', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as AuthResponse;
}

export async function fetchMe(token: string): Promise<PublicUser> {
  const response = await apiFetch('/me', { method: 'GET' }, token);
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as PublicUser;
}
