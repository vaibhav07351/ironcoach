import { useCallback } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { config } from '../config';
import type { GoogleSignInHook } from './googleSignInTypes';

let configured = false;

function ensureConfigured(): void {
  if (configured) {
    return;
  }
  // The Web client id makes Google issue an ID token whose audience the backend accepts.
  GoogleSignin.configure({
    webClientId: config.googleWebClientId,
    iosClientId: config.googleIosClientId || undefined,
  });
  configured = true;
}

/**
 * Native Google sign-in with the system account picker (expo-auth-session redirects are rejected
 * by Google in native release builds). Requires a development or store build, not Expo Go.
 */
export function useGoogleSignIn(): GoogleSignInHook {
  const promptIdToken = useCallback(async (): Promise<string | null> => {
    ensureConfigured();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return null; // cancelled
      }
      if (response.data.idToken) {
        return response.data.idToken;
      }
      const tokens = await GoogleSignin.getTokens();
      return tokens.idToken || null;
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
          return null;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play services are missing or out of date on this phone.');
        }
        if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
          // SHA-1 of the signing key not registered on the Android OAuth client.
          throw new Error('Google sign-in is not set up for this build yet.');
        }
      }
      throw new Error('Google sign-in failed. Please try again.');
    }
  }, []);

  return { ready: true, promptIdToken };
}

/** Clears the cached Google account so the picker shows next time. */
export async function googleSignOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device: nothing to clear.
  }
}
