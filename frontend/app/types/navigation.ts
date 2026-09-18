import { Trainee } from './trainee';
import { Food } from './food';

export type WeightBMIProgress = {
    date: string;
    weight: number;
    bmi: number;
    bodyFat?: number;
};

export type ExerciseRecord = {
    date: string;
    weight: number;
    reps: number;
};

export type ExerciseProgress = {
    exercise: string;
    maxWeight: number;
    avgWeight: number;
    records: ExerciseRecord[];
};

export type Progress = {
    weightBmi: WeightBMIProgress[]; // Array of weight and BMI progress
    exercises: ExerciseProgress[]; // Array of exercise progress
};

export type RootStackParamList = {
    Dashboard: undefined;
    Login: undefined;
    Signup: undefined;
    ClientHome: undefined;
    InviteRedeem: undefined;
    FindCoachHub: undefined;
    TrainerDiscover: undefined;
    CoachRequests: undefined;
    InviteClient: { traineeId: string; traineeName: string };
    Trainees: { status: true | false };
    TraineeDetail: { trainee: Trainee };
    AboutTrainee: { trainee: Trainee };
    TraineeForm: { trainee?: Trainee; traineeId?: string };
    WorkoutLogs: { trainee: Trainee };
    WorkoutLogForm: {
        workoutLog?: {
            id?: string;
            date?: string;
            workouts?: unknown[];
            notes?: string;
        };
        trainee: Trainee;
    };
    Progress: { trainee: Trainee };

    WorkoutCategories: { traineeId: string; selectedDate: Date };
    AddCustomCategory: {
        traineeId: string;
        categoryId?: string;
        currentName?: string;
        selectedDate?: Date;
    };
    WorkoutExercises: {
        category: string;
        category_id: string;
        traineeId: string;
        selectedDate: Date;
    };
    AddCustomExercise: {
        category: string;
        category_id: string;
        traineeId: string;
        exerciseId?: string;
        currentName?: string;
    };
    AddExerciseForm: {
        exercise: string;
        exercise_id: string;
        traineeId: string;
        selectedDate: Date;
    };

    TrainerProfile: { trainerId?: string };

    AddFood: {
        dietEntryId?: string;
        trainee: Trainee;
        date: string;
        mealName: string;
        existingFoods: Food[];
    };
};
