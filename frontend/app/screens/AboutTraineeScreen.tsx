import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AboutDetailsScreen from './AboutDetailsScreen'; // Split AboutTrainee main details
import FitnessTestScreen from './FitnessTestScreen';
import HealthQuestionnaireScreen from './HealthQuestionnaireScreen';

const Tab = createMaterialTopTabNavigator();

export default function AboutTraineeScreen({ trainee }: { trainee: any }) {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#6200ee',
                tabBarIndicatorStyle: { backgroundColor: '#6200ee' },
                tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
                tabBarStyle: { backgroundColor: '#f7f9fc' },
            }}
        >
            <Tab.Screen
                name="About"
                options={{
                    tabBarIcon: ({ color }) => (
                        <Icon name="account" size={19} color={color} />
                    ),
                }}
            >
                {({ navigation }) => <AboutDetailsScreen trainee={trainee} navigation={navigation} />}
            </Tab.Screen>
            <Tab.Screen
                name="Fitness Test"
                options={{
                    tabBarIcon: ({ color }) => (
                        <Icon name="weight-lifter" size={19} color={color} />
                    ),
                }}
            >
                {({ navigation }) => <FitnessTestScreen trainee={trainee} navigation={navigation} />}
            </Tab.Screen>
            <Tab.Screen
                name="Health Questionnaire"
                options={{
                    tabBarIcon: ({ color }) => (
                        <Icon name="clipboard-question-outline" size={15} color={color} />
                    ),
                }}
            >
                {({ navigation }) => <HealthQuestionnaireScreen trainee={trainee} navigation={navigation} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}
