import type { AuthResponse, PublicUser, UserRole } from '../types/auth';
import { http } from './http';

export type GoogleSignInOptions = {
  /** Required only when creating an account. */
  role?: UserRole;
  /** 18+ and terms confirmation; required only when creating an account. */
  acceptTerms?: boolean;
  /** Device IANA time zone. */
  timezone?: string;
};

/**
 * Exchanges a Google ID token for a session. For an unknown Google account the server answers
 * 422 with code `role_required` or `terms_required`; the app then asks for the role and consent
 * and calls this again with the same ID token.
 */
export function signInWithGoogle(idToken: string, options: GoogleSignInOptions = {}): Promise<AuthResponse> {
  return http.post<AuthResponse>(
    '/auth/google',
    {
      id_token: idToken,
      role: options.role,
      accept_terms: options.acceptTerms ?? false,
      timezone: options.timezone,
    },
    { anonymous: true }
  );
}

export function fetchMe(): Promise<PublicUser> {
  return http.get<PublicUser>('/me');
}

export function updateClientInterests(interests: string[]): Promise<PublicUser> {
  return http.put<PublicUser>('/auth/interests', { interests });
}

export function completeTrainerExpertise(expertises: string[]): Promise<PublicUser> {
  return http.put<PublicUser>('/auth/onboarding/trainer/expertise', { expertises });
}

export function updateSettings(timezone: string): Promise<PublicUser> {
  return http.put<PublicUser>('/me/settings', { timezone });
}
