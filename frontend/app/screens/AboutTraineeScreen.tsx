import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import AboutDetailsScreen from './AboutDetailsScreen';
import FitnessTestScreen from './FitnessTestScreen';
import HealthQuestionnaireScreen from './HealthQuestionnaireScreen';

const Tab = createMaterialTopTabNavigator();

/** Profile, assessments and health questionnaire of the current client record. */
export default function AboutTraineeScreen(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIndicatorStyle: { backgroundColor: Colors.primary },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600', textTransform: 'none' },
        tabBarStyle: { backgroundColor: Colors.surface },
      }}
    >
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
