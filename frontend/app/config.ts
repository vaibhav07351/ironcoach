import Constants from 'expo-constants';

/** Runtime configuration from app.config.js `extra`. */
export type AppConfig = {
  backendUrl: string;
  googleWebClientId: string;
  googleAndroidClientId: string;
  googleIosClientId: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  deleteAccountUrl: string;
  playStoreUrl: string;
  appVersion: string;
};

function readString(extra: Record<string, unknown>, key: string): string {
  const value = extra[key];
  return typeof value === 'string' ? value : '';
}

function load(): AppConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const backendUrl = readString(extra, 'backendUrl').replace(/\/$/, '');
  if (!backendUrl) {
    throw new Error('backendUrl is not configured in app.config.js');
  }
  return {
    backendUrl,
    googleWebClientId: readString(extra, 'googleWebClientId'),
    googleAndroidClientId: readString(extra, 'googleAndroidClientId'),
    googleIosClientId: readString(extra, 'googleIosClientId'),
    privacyPolicyUrl: readString(extra, 'privacyPolicyUrl'),
    termsUrl: readString(extra, 'termsUrl'),
    deleteAccountUrl: readString(extra, 'deleteAccountUrl'),
    playStoreUrl: readString(extra, 'playStoreUrl'),
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
  };
}

export const config: AppConfig = load();
