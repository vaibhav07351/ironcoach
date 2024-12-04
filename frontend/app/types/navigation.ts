export type RootStackParamList = {
    Login: undefined; // Login screen
    Dashboard: undefined; // Dashboard screen
    Trainees: undefined; // List of trainees
    TraineeForm: { trainee?: any }; // Edit or add a trainee
    WorkoutLogs: { trainee: any }; // List of workout logs for a trainee
    WorkoutLogForm: { workoutLog?: any; trainee: any }; // Old workout log form (can be removed if not needed)
    Signup: undefined; // Signup screen

    // New Flow for Adding Workout Logs
    WorkoutCategories: { traineeId: string }; // Categories screen
    WorkoutExercises: { category: string; traineeId: string }; // Exercises under a category
    AddExerciseForm: { exercise: string; traineeId: string }; // Add exercise details
    AddCustomCategory: { traineeId: string }; // Add a custom category
    AddCustomExercise: { category: string; traineeId: string }; // Add a custom exercise under a category
};
