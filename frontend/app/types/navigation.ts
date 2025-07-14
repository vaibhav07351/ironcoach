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
    Dashboard: undefined; // Dashboard screen
    Login: undefined; // Login screen
    Signup: undefined; // Signup screen
    Trainees: { status: true | false }; // List of trainees based on status
    TraineeDetail: { trainee: Trainee }; // Trainee detail with tabs
    AboutTrainee: { trainee: Trainee };
    TraineeForm: { trainee?: any; traineeId?: string }; // Include optional traineeId
    WorkoutLogs: { trainee: Trainee }; // List of workout logs for a trainee
    WorkoutLogForm: { workoutLog?: any; trainee: any }; // Edit/Add workout log (new design)
    Progress: { trainee: Trainee };

    // Flow for Adding Workout Logs
    WorkoutCategories: { traineeId: string; selectedDate:Date }; // Categories screen
    AddCustomCategory: {
        traineeId: string;
        categoryId?: string; // Optional categoryId for editing
        currentName?: string; // Optional currentName for pre-filling during editing
        selectedDate?:Date;
    };
    WorkoutExercises: { category: string; category_id:string; traineeId: string; selectedDate: Date}; // Exercises under a category
    AddCustomExercise: { category: string; category_id:string; traineeId: string; exerciseId?: string; currentName?: string; };
    AddExerciseForm: { exercise: string; exercise_id:string; traineeId: string; selectedDate:Date }; // Add exercise details

    // Trainer Profile
    TrainerProfile: { trainerId: string }; // Trainer profile screen

    // LogDiet: { trainee: Trainee; date: string }; // Add this line
    AddFood: {
        dietEntryId?: string; // Optional ID of the existing diet entry
        trainee: any;
        date: string;
        mealName: string;
        existingFoods: Food[];
    };




};
