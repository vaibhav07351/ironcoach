import { Trainee } from './trainee';
import { Food } from './food';

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
    WorkoutCategories: { traineeId: string }; // Categories screen
    AddCustomCategory: { traineeId: string }; // Add a custom category
    WorkoutExercises: { category: string; traineeId: string }; // Exercises under a category
    AddCustomExercise: { category: string; traineeId: string }; // Add a custom exercise under a category
    AddExerciseForm: { exercise: string; traineeId: string }; // Add exercise details

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
