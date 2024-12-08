export type RootStackParamList = {

    Dashboard: undefined; // Dashboard screen
    Login: undefined; // Login screen    
    Signup: undefined; // Signup screen
    Trainees: undefined; // List of trainees
    TraineeForm: { trainee?: any; traineeId?: string }; // Include optional traineeId
    WorkoutLogs: { trainee: any }; // List of workout logs for a trainee
    WorkoutLogForm: { workoutLog?: any; trainee: any }; // Old workout log form (can be removed if not needed)
    
    // New Flow for Adding Workout Logs
    WorkoutCategories: { traineeId: string }; // Categories screen
    AddCustomCategory: { traineeId: string }; // Add a custom category
    WorkoutExercises: { category: string; traineeId: string }; // Exercises under a category
    AddCustomExercise: { category: string; traineeId: string }; // Add a custom exercise under a category
    AddExerciseForm: { exercise: string; traineeId: string }; // Add exercise details
    };
