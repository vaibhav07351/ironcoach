import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
// Per-weight imports: the package index would bundle all 14 weights.
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { toastConfig } from '@/components/ThemedToast';
import { AuthProvider } from './app/contexts/AuthContext';
import { ThemeProvider, useTheme } from './app/contexts/ThemeContext';
import { useWantsLightStatusBar } from './app/hooks/useLightStatusBar';
import { RootNavigator } from './app/navigation/RootNavigator';

/** Longest the native splash waits for the brand font before the app starts on the system font. */
const FONT_TIMEOUT_MS = 3000;

SplashScreen.preventAutoHideAsync().catch((e: unknown) => {
  console.warn('splash screen not held', e instanceof Error ? e.message : String(e));
});

function useBrandFont(): { ready: boolean; loaded: boolean } {
  const [loaded, error] = useFonts({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (error) {
      console.warn('brand font not loaded, using system font', error.message);
    }
  }, [error]);

  return { ready: loaded || !!error || timedOut, loaded };
}

function ThemedApp(): React.JSX.Element {
  const theme = useTheme();
  const { colors, scheme } = theme;

  const heroOnTop = useWantsLightStatusBar();

  const navigationTheme = useMemo<NavTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.tint,
        background: colors.bg,
        card: colors.bg,
        text: colors.text,
        border: colors.separator,
        notification: colors.accent,
      },
    };
  }, [colors, scheme]);

  return (
    <>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={heroOnTop || scheme === 'dark' ? 'light' : 'dark'} animated />
        <RootNavigator />
      </NavigationContainer>
      <Toast config={toastConfig} position="top" topOffset={56} visibilityTime={4000} />
    </>
  );
}

export default function App(): React.JSX.Element | null {
  const font = useBrandFont();

  useEffect(() => {
    if (font.ready) {
      SplashScreen.hideAsync().catch((e: unknown) => {
        console.warn('splash screen not hidden', e instanceof Error ? e.message : String(e));
      });
    }
  }, [font.ready]);

  if (!font.ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider brandFont={font.loaded}>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
