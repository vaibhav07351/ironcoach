import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Toast from 'react-native-toast-message';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import TraineeListScreen from './screens/TraineeListScreen';
import { RootStackParamList } from './types/navigation';
import TraineeFormScreen from './screens/TraineeFormScreen';
import WorkoutLogListScreen from './screens/WorkoutLogListScreen';
import WorkoutLogFormScreen from './screens/WorkoutLogFormScreen';
import SignupScreen from './screens/SignupScreen';
import WorkoutCategoriesScreen from './screens/WorkoutCategoriesScreen';
import AddExerciseFormScreen from './screens/AddExerciseFormScreen';
import AddCustomCategoryScreen from './screens/AddCustomCategoryScreen';
import WorkoutExercisesScreen from './screens/WorkoutExercisesScreen';
import AddCustomExerciseScreen from './screens/AddCustomExerciseScreen';
import TraineeDetailScreen from './screens/TraineeDetailScreen';
import TrainerProfileScreen from './screens/TrainerProfileScreen';
import AboutTraineeScreen from './screens/AboutTraineeScreen';
import ProgressScreen from './screens/ProgressScreen';
import AddFoodScreen from './screens/AddFoodScreen';
// import AboutTraineeScreenTabs from './screens/AboutTraineeScreenTabs';


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigation() {
    return (
      <ThemeProvider>
          <AuthProvider>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Trainees" component={TraineeListScreen} />
                <Stack.Screen name="TraineeForm" component={TraineeFormScreen} />
                {/* <Stack.Screen name="WorkoutLogs" component={WorkoutLogListScreen} /> */}
                <Stack.Screen name="WorkoutLogForm" component={WorkoutLogFormScreen} />
                <Stack.Screen name="WorkoutCategories" component={WorkoutCategoriesScreen} />
                <Stack.Screen name="AddCustomCategory" component={AddCustomCategoryScreen} />
                <Stack.Screen name="WorkoutExercises" component={WorkoutExercisesScreen} />
                <Stack.Screen name="AddCustomExercise" component={AddCustomExerciseScreen} />
                <Stack.Screen name="AddExerciseForm" component={AddExerciseFormScreen} />
                <Stack.Screen name="TraineeDetail" component={TraineeDetailScreen} />
                <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />
                {/* <Stack.Screen name="AboutTrainee" component={AboutTraineeScreen} /> */}
                <Stack.Screen name="AddFood" component={AddFoodScreen} />
                {/* <Stack.Screen name="Progress" component={ProgressScreen} /> */}
                {/* <Stack.Screen name="AboutTraineeScreenTabs" component={AboutTraineeScreenTabs} /> */}

            </Stack.Navigator>
           <Toast />
          </AuthProvider>
      </ThemeProvider>
    );
}
