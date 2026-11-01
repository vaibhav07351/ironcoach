import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useTheme } from '../contexts/ThemeContext';
import AccountScreen from '../screens/AccountScreen';
import ClientTodayScreen from '../screens/ClientTodayScreen';
import type { ClientTabParamList } from '../types/navigation';
import { tabListeners, tabScreenOptions, type TabIcon } from './tabOptions';

const Tab = createBottomTabNavigator<ClientTabParamList>();

const icons: Record<keyof ClientTabParamList, TabIcon> = {
  Home: 'today',
  Account: 'person-circle',
};

/** Client Today and account. */
export function ClientTabs(): React.JSX.Element {
  const theme = useTheme();
  const screenOptions = useMemo(() => tabScreenOptions<ClientTabParamList>(theme, icons), [theme]);
  return (
    <Tab.Navigator screenOptions={screenOptions} screenListeners={tabListeners}>
      <Tab.Screen name="Home" component={ClientTodayScreen} options={{ title: 'Today', headerShown: false }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
