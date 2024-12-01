import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import TraineeListScreen from './screens/TraineeListScreen';
import { RootStackParamList } from './types/navigation';
import TraineeFormScreen from './screens/TraineeFormScreen';
import WorkoutLogListScreen from './screens/WorkoutLogListScreen';
import WorkoutLogFormScreen from './screens/WorkoutLogFormScreen';


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigation() {
    return (
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Trainees" component={TraineeListScreen} />
                <Stack.Screen name="TraineeForm" component={TraineeFormScreen} />
                <Stack.Screen name="WorkoutLogs" component={WorkoutLogListScreen} />
                <Stack.Screen name="WorkoutLogForm" component={WorkoutLogFormScreen} />

            </Stack.Navigator>

    );
}
