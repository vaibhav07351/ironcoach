import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import AccountScreen from '../screens/AccountScreen';
import TraineeListScreen from '../screens/TraineeListScreen';
import TrainerTodayScreen from '../screens/TrainerTodayScreen';
import type { TrainerTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<TrainerTabParamList>();

const icons: Record<keyof TrainerTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'today-outline',
  Clients: 'people-outline',
  Account: 'person-circle-outline',
};

/** Trainer home: today's overview, the client list and account. */
export function TrainerTabs(): React.JSX.Element {
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
      <Tab.Screen name="Home" component={TrainerTodayScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Clients" component={TraineeListScreen} options={{ title: 'Clients' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
