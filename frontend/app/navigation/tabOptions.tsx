import React from 'react';
import { StyleSheet } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { RouteProp, ParamListBase } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { Theme } from '../contexts/ThemeContext';
import { haptic } from '../utils/haptics';

/** An Ionicons base name that has both a filled and an "-outline" variant. */
export type TabIcon = 'today' | 'people' | 'person-circle';

/** Shared look of both role's tab bars: themed, filled icon on the active tab, stack-style headers. */
export function tabScreenOptions<P extends ParamListBase>(
  theme: Theme,
  icons: Record<keyof P, TabIcon>
): (props: { route: RouteProp<P> }) => BottomTabNavigationOptions {
  const { colors, type } = theme;
  return ({ route }) => ({
    headerStyle: { backgroundColor: colors.bg },
    headerShadowVisible: false,
    headerTitleStyle: { ...type.heading, color: colors.text },
    headerTitleAlign: 'left',
    tabBarActiveTintColor: colors.tint,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.separator,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    tabBarIcon: ({ color, size, focused }) => {
      const base = icons[route.name as keyof P];
      return <Ionicons name={focused ? base : `${base}-outline`} size={size} color={color} />;
    },
    sceneStyle: { backgroundColor: colors.bg },
  });
}

export const tabListeners = {
  tabPress: (): void => haptic('select'),
};
