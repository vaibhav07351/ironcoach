import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchMe, updateSettings } from '../services/authService';
import { ApiError, setUnauthorizedHandler } from '../services/http';
import { clearToken, getToken, setToken } from '../services/tokenStore';
import { googleSignOut } from '../hooks/useGoogleSignIn';
import type { AuthResponse, PublicUser } from '../types/auth';
import { deviceTimeZone } from '../utils/date';

// The profile is not secret; it is cached so the app can open offline.
const USER_CACHE_KEY = 'ironcoach.user';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason?: 'expired' }
  | { status: 'signedIn'; user: PublicUser };

type AuthContextValue = {
  state: AuthState;
  user: PublicUser | null;
  /** Stores the session from a sign-in or invite redeem. */
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the profile from the server (after linking, onboarding steps). */
  refreshUser: () => Promise<PublicUser | null>;
  /** Replaces the cached profile with one returned by an API call. */
  setUser: (user: PublicUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

async function cacheUser(user: PublicUser): Promise<void> {
  await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

async function readCachedUser(): Promise<PublicUser | null> {
  const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

/** Keeps the server's time zone in step with the device (best-effort). */
async function syncTimeZone(user: PublicUser): Promise<PublicUser> {
  const zone = deviceTimeZone();
  if (!zone || zone === user.timezone) {
    return user;
  }
  try {
    return await updateSettings(zone);
  } catch {
    return user;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const signingOut = useRef(false);

  const signOut = useCallback(async (reason?: 'expired'): Promise<void> => {
    if (signingOut.current) {
      return;
    }
    signingOut.current = true;
    try {
      await Promise.all([clearToken(), AsyncStorage.removeItem(USER_CACHE_KEY), googleSignOut()]);
    } finally {
      setState({ status: 'signedOut', reason });
      signingOut.current = false;
    }
  }, []);

  // Any 401 from the API means the session is gone (expired, account deleted): sign out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut('expired');
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore the session on launch.
  useEffect(() => {
    let cancelled = false;
    const restore = async (): Promise<void> => {
      const token = await getToken();
      if (!token) {
        if (!cancelled) setState({ status: 'signedOut' });
        return;
      }
      const cached = await readCachedUser();
      if (cached && !cancelled) {
        setState({ status: 'signedIn', user: cached });
      }
      try {
        const fresh = await syncTimeZone(await fetchMe());
        await cacheUser(fresh);
        if (!cancelled) setState({ status: 'signedIn', user: fresh });
      } catch (error: unknown) {
        // Offline: keep the cached profile. Without one there is nothing to show.
        if (error instanceof ApiError && error.isNetwork && cached) {
          return;
        }
        if (!(error instanceof ApiError && error.status === 401)) {
          // 401 is already handled by the unauthorized handler.
          await signOut();
        }
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  const signIn = useCallback(async (auth: AuthResponse): Promise<void> => {
    await setToken(auth.token);
    const user = await syncTimeZone(auth.user);
    await cacheUser(user);
    setState({ status: 'signedIn', user });
  }, []);

  const setUser = useCallback(async (user: PublicUser): Promise<void> => {
    await cacheUser(user);
    setState({ status: 'signedIn', user });
  }, []);

  const refreshUser = useCallback(async (): Promise<PublicUser | null> => {
    try {
      const fresh = await fetchMe();
      await setUser(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'signedIn' ? state.user : null,
      signIn,
      signOut: () => signOut(),
      refreshUser,
      setUser,
    }),
    [state, signIn, signOut, refreshUser, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
