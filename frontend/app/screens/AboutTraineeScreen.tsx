import React, { useMemo } from 'react';
import { createMaterialTopTabNavigator, type MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';
import AboutDetailsScreen from './AboutDetailsScreen';
import FitnessTestScreen from './FitnessTestScreen';
import HealthQuestionnaireScreen from './HealthQuestionnaireScreen';

const Tab = createMaterialTopTabNavigator();

/** Profile, assessments and health questionnaire of the current client record. */
export default function AboutTraineeScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const screenOptions = useMemo<MaterialTopTabNavigationOptions>(
    () => ({
      tabBarActiveTintColor: colors.tint,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarIndicatorStyle: { backgroundColor: colors.accent, height: 3, borderRadius: 2 },
      tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
      tabBarStyle: { backgroundColor: colors.bg, elevation: 0, shadowOpacity: 0 },
      sceneStyle: { backgroundColor: colors.bg },
    }),
    [colors]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="About"
        component={AboutDetailsScreen}
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account" size={19} color={color} /> }}
      />
      <Tab.Screen
        name="Fitness Test"
        component={FitnessTestScreen}
        options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="weight-lifter" size={19} color={color} /> }}
      />
      <Tab.Screen
        name="Health"
        component={HealthQuestionnaireScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-pulse-outline" size={19} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
