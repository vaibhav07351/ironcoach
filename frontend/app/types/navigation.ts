import type { NavigatorScreenParams } from '@react-navigation/native';

import type { Food } from './food';
import type { Trainee } from './trainee';
import type { WorkoutLog } from './workout';

/** Sections of one client record screen. Trainers see all of them; clients do not see Overview. */
export type ClientSection = 'overview' | 'workouts' | 'diet' | 'weight' | 'attendance' | 'fees' | 'profile';

/** Trainer bottom tabs. */
export type TrainerTabParamList = {
  Home: undefined;
  Clients: undefined;
  Account: undefined;
};

/** Client bottom tabs. */
export type ClientTabParamList = {
  Home: undefined;
  Account: undefined;
};

/**
 * The root stack. Which screens exist depends on the auth state (see RootNavigator); screens
 * never redirect between roles by hand. All params are serialisable (dates are YYYY-MM-DD strings).
 */
export type RootStackParamList = {
  // Gate and auth
  Splash: undefined;
  UpdateRequired: undefined;
  SignIn: undefined;

  // Onboarding
  TrainerExpertise: undefined;
  ClientInterests: undefined;
  JoinCoach: undefined;

  // Main
  TrainerTabs: NavigatorScreenParams<TrainerTabParamList> | undefined;
  ClientTabs: NavigatorScreenParams<ClientTabParamList> | undefined;

  // Account
  DeleteAccount: undefined;
  TrainerProfile: undefined;

  // Trainer
  CoachRequests: undefined;
  InviteClient: { traineeId: string; traineeName: string };
  Trainees: { status?: boolean } | undefined;
  TraineeForm: { traineeId?: string } | undefined;

  // Shared client record screens
  TraineeDetail: { trainee: Pick<Trainee, 'id' | 'name'>; section?: ClientSection };
  AddPackage: { traineeId: string; traineeName: string };
  AddPayment: { traineeId: string; traineeName: string; duePaise?: number };
  UpiSettings: undefined;
  WorkoutLogForm: { traineeId: string; log: WorkoutLog };
  WorkoutCategories: { traineeId: string; date: string };
  AddCustomCategory: { traineeId: string; categoryId?: string; currentName?: string };
  WorkoutExercises: { traineeId: string; categoryId: string; categoryName: string; date: string };
  AddCustomExercise: {
    traineeId: string;
    categoryId: string;
    categoryName: string;
    exerciseId?: string;
    currentName?: string;
  };
  AddExerciseForm: { traineeId: string; exercise: string; exerciseId: string; date: string };
  LogSession: { traineeId: string; date: string; activityType: string };
  AddFood: {
    traineeId: string;
    date: string;
    mealName: string;
    dietEntryId?: string;
    existingFoods: Food[];
  };
};
