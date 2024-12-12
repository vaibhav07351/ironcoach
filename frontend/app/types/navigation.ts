import { Trainee } from './trainee';

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
};
