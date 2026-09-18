import 'react-native-gesture-handler';
import React, { type ReactNode } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { AuthProvider } from './app/contexts/AuthContext';
import { ThemeProvider } from './app/contexts/ThemeContext';
import { RootStackParamList } from './app/types/navigation';
import { Colors } from '@/constants/theme';
import { ScreenKeyboardAvoiding } from '@/components/ScreenKeyboardAvoiding';

import LoginScreen from './app/screens/LoginScreen';
import DashboardScreen from './app/screens/DashboardScreen';
import TraineeListScreen from './app/screens/TraineeListScreen';
import TraineeFormScreen from './app/screens/TraineeFormScreen';
import WorkoutLogFormScreen from './app/screens/WorkoutLogFormScreen';
import SignupScreen from './app/screens/SignupScreen';
import WorkoutCategoriesScreen from './app/screens/WorkoutCategoriesScreen';
import AddExerciseFormScreen from './app/screens/AddExerciseFormScreen';
import AddCustomCategoryScreen from './app/screens/AddCustomCategoryScreen';
import WorkoutExercisesScreen from './app/screens/WorkoutExercisesScreen';
import AddCustomExerciseScreen from './app/screens/AddCustomExerciseScreen';
import TraineeDetailScreen from './app/screens/TraineeDetailScreen';
import TrainerProfileScreen from './app/screens/TrainerProfileScreen';
import AddFoodScreen from './app/screens/AddFoodScreen';
import ClientHomeScreen from './app/screens/ClientHomeScreen';
import InviteRedeemScreen from './app/screens/InviteRedeemScreen';
import InviteClientScreen from './app/screens/InviteClientScreen';
import FindCoachHubScreen from './app/screens/FindCoachHubScreen';
import TrainerDiscoverScreen from './app/screens/TrainerDiscoverScreen';
import CoachRequestsScreen from './app/screens/CoachRequestsScreen';
import { TrainerHeaderAvatar } from './components/TrainerHeaderAvatar';

const Stack = createNativeStackNavigator<RootStackParamList>();

function stackScreenLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <ScreenKeyboardAvoiding>{children}</ScreenKeyboardAvoiding>;
}

export default function App(): React.JSX.Element {
  return (
    <>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenLayout={stackScreenLayout}
              screenOptions={{
                headerShown: true,
                headerBackVisible: true,
                headerStyle: { backgroundColor: Colors.background },
                headerTintColor: Colors.primary,
                headerTitleStyle: { color: Colors.textPrimary },
                contentStyle: { backgroundColor: Colors.background },
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Signup"
                component={SignupScreen}
                options={{ title: 'Sign up' }}
              />
              <Stack.Screen
                name="ClientHome"
                component={ClientHomeScreen}
                options={{ title: 'IronCoach' }}
              />
              <Stack.Screen
                name="InviteRedeem"
                component={InviteRedeemScreen}
                options={{ title: 'Join your coach' }}
              />
              <Stack.Screen
                name="FindCoachHub"
                component={FindCoachHubScreen}
                options={{ title: 'Find a coach', headerShown: true }}
              />
              <Stack.Screen
                name="TrainerDiscover"
                component={TrainerDiscoverScreen}
                options={{ title: 'Discover coaches' }}
              />
              <Stack.Screen
                name="CoachRequests"
                component={CoachRequestsScreen}
                options={{ title: 'Coaching requests' }}
              />
              <Stack.Screen
                name="InviteClient"
                component={InviteClientScreen}
                options={{ title: 'Invite client' }}
              />
              <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                  title: 'IronCoach',
                  headerRight: () => <TrainerHeaderAvatar />,
                }}
              />
              <Stack.Screen
                name="Trainees"
                component={TraineeListScreen}
                options={{ title: 'Clients' }}
              />
              <Stack.Screen
                name="TraineeForm"
                component={TraineeFormScreen}
                options={{ title: 'Profile' }}
              />
              <Stack.Screen
                name="WorkoutLogForm"
                component={WorkoutLogFormScreen}
                options={{ title: 'Workout log' }}
              />
              <Stack.Screen
                name="WorkoutCategories"
                component={WorkoutCategoriesScreen}
                options={{ title: 'Categories' }}
              />
              <Stack.Screen
                name="AddCustomCategory"
                component={AddCustomCategoryScreen}
                options={{ title: 'Category' }}
              />
              <Stack.Screen
                name="WorkoutExercises"
                component={WorkoutExercisesScreen}
                options={{ title: 'Exercises' }}
              />
              <Stack.Screen
                name="AddCustomExercise"
                component={AddCustomExerciseScreen}
                options={{ title: 'Exercise' }}
              />
              <Stack.Screen
                name="AddExerciseForm"
                component={AddExerciseFormScreen}
                options={{ title: 'Log exercise' }}
              />
              <Stack.Screen
                name="TraineeDetail"
                component={TraineeDetailScreen}
                options={({ route }) => ({
                  title: route.params.trainee?.name ?? 'Client',
                })}
              />
              <Stack.Screen
                name="TrainerProfile"
                component={TrainerProfileScreen}
                options={{ title: 'Profile' }}
              />
              <Stack.Screen
                name="AddFood"
                component={AddFoodScreen}
                options={{ title: 'Add food' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>

      <Toast position="top" topOffset={50} visibilityTime={4000} />
    </>
  );
}
