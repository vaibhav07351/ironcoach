import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useTheme } from '../contexts/ThemeContext';
import AccountScreen from '../screens/AccountScreen';
import TraineeListScreen from '../screens/TraineeListScreen';
import TrainerTodayScreen from '../screens/TrainerTodayScreen';
import type { TrainerTabParamList } from '../types/navigation';
import { tabListeners, tabScreenOptions, type TabIcon } from './tabOptions';

const Tab = createBottomTabNavigator<TrainerTabParamList>();

const icons: Record<keyof TrainerTabParamList, TabIcon> = {
  Home: 'today',
  Clients: 'people',
  Account: 'person-circle',
};

/** Trainer home: today's overview, the client list and account. */
export function TrainerTabs(): React.JSX.Element {
  const theme = useTheme();
  const screenOptions = useMemo(() => tabScreenOptions<TrainerTabParamList>(theme, icons), [theme]);
  return (
    <Tab.Navigator screenOptions={screenOptions} screenListeners={tabListeners}>
      <Tab.Screen name="Home" component={TrainerTodayScreen} options={{ title: 'Today', headerShown: false }} />
      <Tab.Screen name="Clients" component={TraineeListScreen} options={{ title: 'Clients' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
