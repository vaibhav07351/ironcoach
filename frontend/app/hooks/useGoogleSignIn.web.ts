import { useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { config } from '../config';
import type { GoogleSignInHook } from './googleSignInTypes';

// Completes the redirect when Google returns to the web app.
WebBrowser.maybeCompleteAuthSession();

/** Web Google sign-in (expo-auth-session ID token flow). */
export function useGoogleSignIn(): GoogleSignInHook {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: config.googleWebClientId,
    webClientId: config.googleWebClientId,
  });

  const promptIdToken = useCallback(async (): Promise<string | null> => {
    const result = await promptAsync();
    if (result.type !== 'success') {
      return null;
    }
    const token = result.params.id_token;
    if (!token) {
      throw new Error('Google sign-in failed. Please try again.');
    }
    return token;
  }, [promptAsync]);

  return { ready: !!request, promptIdToken };
}

export async function googleSignOut(): Promise<void> {
  // Web sessions hold no Google state in the app.
}
