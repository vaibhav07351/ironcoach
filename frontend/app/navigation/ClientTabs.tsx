import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import AccountScreen from '../screens/AccountScreen';
import ClientTodayScreen from '../screens/ClientTodayScreen';
import type { ClientTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<ClientTabParamList>();

const icons: Record<keyof ClientTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Account: 'person-circle-outline',
};

/** Client Today and account. */
export function ClientTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: Colors.textPrimary },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
        sceneStyle: { backgroundColor: Colors.background },
      })}
    >
      <Tab.Screen name="Home" component={ClientTodayScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
