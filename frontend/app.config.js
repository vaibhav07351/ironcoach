// Expo app configuration. Plain JS (not app.json) so values can come from EXPO_PUBLIC_* env
// vars per EAS build profile. The defaults are the production values.
//
// OAuth client ids are public identifiers, not secrets.

const env = (key, fallback) => process.env[key] || fallback;

const API_URL = env('EXPO_PUBLIC_API_URL', 'https://ironcoach.duckdns.org');
const GOOGLE_WEB_CLIENT_ID = env(
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  '883815662037-7l4am1d65uoo5cetj09nurm2ednjg1lg.apps.googleusercontent.com'
);
const GOOGLE_ANDROID_CLIENT_ID = env(
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  '883815662037-j43hk42ou4lf9eu88c07a8tpnbedk2pr.apps.googleusercontent.com'
);
const GOOGLE_IOS_CLIENT_ID = env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', '');
// iOS is not shipped yet; the plugin only needs a correctly prefixed scheme.
const GOOGLE_IOS_URL_SCHEME = env(
  'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
  'com.googleusercontent.apps.ironcoach-ios-not-configured'
);
// Public legal pages (GitHub Pages). Placeholders until the owner publishes them.
const LEGAL_BASE_URL = env('EXPO_PUBLIC_LEGAL_BASE_URL', 'https://trainernearme.github.io');
const ANDROID_PACKAGE = 'com.vaibhavbhardwaj.ironcoach';

module.exports = {
  expo: {
    name: 'TrainerNearMe',
    slug: 'IronCoach',
    owner: 'vaibhav07351',
    version: '1.1.0',
    // Over-the-air updates only reach builds with the same app version, so a JS update can never
    // run on a binary that lacks the native modules it needs.
    runtimeVersion: { policy: 'appVersion' },
    orientation: 'portrait',
    icon: './assets/images/trainernearme-icon.png',
    scheme: 'ironcoach',
    userInterfaceStyle: 'light',
    description: 'Free client manager for personal trainers: clients, workouts, diet and progress.',
    primaryColor: '#07173D',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.vaibhavbhardwaj.ironcoach',
    },
    android: {
      package: ANDROID_PACKAGE,
      adaptiveIcon: {
        foregroundImage: './assets/images/trainernearme-icon.png',
        backgroundColor: '#07173D',
      },
      softwareKeyboardLayoutMode: 'resize',
      permissions: ['ACCESS_COARSE_LOCATION'],
      blockedPermissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/trainernearme-icon.png',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/images/trainernearme-logo.png',
          imageWidth: 240,
          resizeMode: 'contain',
          backgroundColor: '#07173D',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow TrainerNearMe to use your approximate location to show your area on your coach profile.',
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow TrainerNearMe to use a photo you choose for a profile picture.',
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      'expo-secure-store',
      ['@react-native-google-signin/google-signin', { iosUrlScheme: GOOGLE_IOS_URL_SCHEME }],
    ],
    extra: {
      eas: { projectId: '7067ae90-2994-477c-9616-cc290d9c2d06' },
      backendUrl: API_URL,
      googleWebClientId: GOOGLE_WEB_CLIENT_ID,
      googleAndroidClientId: GOOGLE_ANDROID_CLIENT_ID,
      googleIosClientId: GOOGLE_IOS_CLIENT_ID,
      privacyPolicyUrl: `${LEGAL_BASE_URL}/privacy`,
      termsUrl: `${LEGAL_BASE_URL}/terms`,
      deleteAccountUrl: `${LEGAL_BASE_URL}/delete-account`,
      playStoreUrl: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    },
    updates: {
      url: 'https://u.expo.dev/7067ae90-2994-477c-9616-cc290d9c2d06',
    },
  },
};
