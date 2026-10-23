import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Session token storage. Native uses the OS keystore (expo-secure-store, encrypted);
 * web has no secure store, so it falls back to AsyncStorage (localStorage).
 * The token is also cached in memory so every request does not hit storage.
 */
const TOKEN_KEY = 'ironcoach.session_token';

let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached !== undefined) {
    return cached;
  }
  cached =
    Platform.OS === 'web'
      ? await AsyncStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  return cached;
}

export async function setToken(token: string): Promise<void> {
  cached = token;
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
