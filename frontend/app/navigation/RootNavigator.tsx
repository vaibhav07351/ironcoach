import React, { type ReactNode } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ScreenKeyboardAvoiding } from '@/components/ScreenKeyboardAvoiding';
import { Colors } from '@/constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateRequired } from '../hooks/useUpdateGate';
import ClientInterestsScreen from '../screens/ClientInterestsScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import JoinCoachScreen from '../screens/JoinCoachScreen';
import SignInScreen from '../screens/SignInScreen';
import SplashScreen from '../screens/SplashScreen';
import TrainerExpertiseScreen from '../screens/TrainerExpertiseScreen';
import UpdateRequiredScreen from '../screens/UpdateRequiredScreen';
import type { RootStackParamList } from '../types/navigation';
import { ClientTabs } from './ClientTabs';
import { TrainerTabs } from './TrainerTabs';

const Stack = createNativeStackNavigator<RootStackParamList>();

function keyboardSafe({ children }: { children: ReactNode }): React.JSX.Element {
  return <ScreenKeyboardAvoiding>{children}</ScreenKeyboardAvoiding>;
}

/*
 * Heavy screens are loaded on first use (getComponent) so app start only parses the screens it
 * shows first.
 */
// getComponent must return synchronously, so these are require() calls on purpose (Metro resolves them
// lazily at first navigation).
/* eslint-disable @typescript-eslint/no-require-imports */
const lazy = {
  TrainerProfile: () => require('../screens/TrainerProfileScreen').default,
  CoachRequests: () => require('../screens/CoachRequestsScreen').default,
  InviteClient: () => require('../screens/InviteClientScreen').default,
  Trainees: () => require('../screens/TraineeListScreen').default,
  TraineeForm: () => require('../screens/TraineeFormScreen').default,
  TraineeDetail: () => require('../screens/ClientRecordScreen').default,
  AddPackage: () => require('../screens/AddPackageScreen').default,
  AddPayment: () => require('../screens/AddPaymentScreen').default,
  UpiSettings: () => require('../screens/UpiSettingsScreen').default,
  WorkoutLogForm: () => require('../screens/WorkoutLogFormScreen').default,
  WorkoutCategories: () => require('../screens/WorkoutCategoriesScreen').default,
  AddCustomCategory: () => require('../screens/AddCustomCategoryScreen').default,
  WorkoutExercises: () => require('../screens/WorkoutExercisesScreen').default,
  AddCustomExercise: () => require('../screens/AddCustomExerciseScreen').default,
  AddExerciseForm: () => require('../screens/AddExerciseFormScreen').default,
  LogSession: () => require('../screens/LogSessionScreen').default,
  AddFood: () => require('../screens/AddFoodScreen').default,
};
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * The whole app's navigation, chosen from state. Signing in, finishing onboarding, joining a coach
 * or signing out swaps the available screens, and React Navigation shows the first one; no screen
 * redirects by hand.
 */
export function RootNavigator(): React.JSX.Element {
  const { state, user } = useAuth();
  const updateRequired = useUpdateRequired();

  const screens = ((): React.JSX.Element => {
    if (updateRequired) {
      return <Stack.Screen name="UpdateRequired" component={UpdateRequiredScreen} options={{ headerShown: false }} />;
    }
    if (state.status === 'loading') {
      return <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />;
    }
    if (state.status === 'signedOut' || !user) {
      return <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />;
    }

    const account = (
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete account' }} />
    );

    if (user.role === 'trainer') {
      if (user.needs_onboarding) {
        return (
          <>
            <Stack.Screen name="TrainerExpertise" component={TrainerExpertiseScreen} options={{ headerShown: false }} />
            {account}
          </>
        );
      }
      return (
        <>
          <Stack.Screen name="TrainerTabs" component={TrainerTabs} options={{ headerShown: false }} />
          <Stack.Screen name="TrainerProfile" getComponent={lazy.TrainerProfile} options={{ title: 'Coach profile' }} />
          <Stack.Screen name="CoachRequests" getComponent={lazy.CoachRequests} options={{ title: 'Coaching requests' }} />
          <Stack.Screen name="InviteClient" getComponent={lazy.InviteClient} options={{ title: 'Invite client' }} />
          <Stack.Screen name="Trainees" getComponent={lazy.Trainees} options={{ title: 'Clients' }} />
          <Stack.Screen name="TraineeForm" getComponent={lazy.TraineeForm} options={{ title: 'Client' }} />
          <Stack.Screen name="AddPackage" getComponent={lazy.AddPackage} options={{ title: 'Sell package' }} />
          <Stack.Screen name="AddPayment" getComponent={lazy.AddPayment} options={{ title: 'Record payment' }} />
          <Stack.Screen name="UpiSettings" getComponent={lazy.UpiSettings} options={{ title: 'UPI id' }} />
          {sharedClientScreens}
          {account}
        </>
      );
    }

    // Client
    if (user.needs_interests) {
      return (
        <>
          <Stack.Screen name="ClientInterests" component={ClientInterestsScreen} options={{ headerShown: false }} />
          {account}
        </>
      );
    }
    if (user.needs_invite || !user.trainee_id) {
      return (
        <>
          <Stack.Screen name="JoinCoach" component={JoinCoachScreen} options={{ headerShown: false }} />
          {account}
        </>
      );
    }
    return (
      <>
        <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
        {sharedClientScreens}
        {account}
      </>
    );
  })();

  return (
    <Stack.Navigator
      screenLayout={keyboardSafe}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      {screens}
    </Stack.Navigator>
  );
}

/** Screens for working on one client record, used by trainers and by the client themselves. */
const sharedClientScreens = (
  <>
    <Stack.Screen
      name="TraineeDetail"
      getComponent={lazy.TraineeDetail}
      options={({ route }) => ({ title: route.params.trainee.name || 'Client' })}
    />
    <Stack.Screen name="WorkoutLogForm" getComponent={lazy.WorkoutLogForm} options={{ title: 'Edit workout' }} />
    <Stack.Screen name="WorkoutCategories" getComponent={lazy.WorkoutCategories} options={{ title: 'Categories' }} />
    <Stack.Screen name="AddCustomCategory" getComponent={lazy.AddCustomCategory} options={{ title: 'Category' }} />
    <Stack.Screen name="WorkoutExercises" getComponent={lazy.WorkoutExercises} options={{ title: 'Exercises' }} />
    <Stack.Screen name="AddCustomExercise" getComponent={lazy.AddCustomExercise} options={{ title: 'Exercise' }} />
    <Stack.Screen name="AddExerciseForm" getComponent={lazy.AddExerciseForm} options={{ title: 'Log exercise' }} />
    <Stack.Screen name="LogSession" getComponent={lazy.LogSession} options={{ title: 'Log session' }} />
    <Stack.Screen name="AddFood" getComponent={lazy.AddFood} options={{ title: 'Add food' }} />
  </>
);
