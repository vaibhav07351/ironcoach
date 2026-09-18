import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicUser, UserRole } from '../types/auth';
import { fetchMe } from '../services/authService';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | {
      status: 'signedIn';
      token: string;
      user: PublicUser;
    };

type AuthContextType = {
  state: AuthState;
  isAuthenticated: boolean;
  role: UserRole | null;
  user: PublicUser | null;
  token: string | null;
  login: (token: string, user: PublicUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
  state: { status: 'loading' },
  isAuthenticated: false,
  role: null,
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const hydrate = useCallback(async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!token) {
        setState({ status: 'signedOut' });
        return;
      }

      if (userJson) {
        const user = JSON.parse(userJson) as PublicUser;
        setState({ status: 'signedIn', token, user });
        try {
          const fresh = await fetchMe(token);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
          setState({ status: 'signedIn', token, user: fresh });
        } catch {
          // keep cached user if /me fails (offline)
        }
        return;
      }

      const fresh = await fetchMe(token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
      setState({ status: 'signedIn', token, user: fresh });
    } catch {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      setState({ status: 'signedOut' });
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = async (token: string, user: PublicUser): Promise<void> => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ status: 'signedIn', token, user });
  };

  const logout = async (): Promise<void> => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setState({ status: 'signedOut' });
  };

  const refreshUser = async (): Promise<void> => {
    if (state.status !== 'signedIn') {
      return;
    }
    const fresh = await fetchMe(state.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
    setState({ status: 'signedIn', token: state.token, user: fresh });
  };

  const isAuthenticated = state.status === 'signedIn';
  const user = state.status === 'signedIn' ? state.user : null;
  const token = state.status === 'signedIn' ? state.token : null;
  const role = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        state,
        isAuthenticated,
        role,
        user,
        token,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
