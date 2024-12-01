export type RootStackParamList = {
    Login: undefined;
    Dashboard: undefined;
    Trainees: undefined;
    // WorkoutLogs: undefined;
    // item: undefined;
    TraineeForm: { trainee?: any }; // Pass trainee for editing
    WorkoutLogs: { trainee: any }; // Pass trainee to show their workout logs
    WorkoutLogForm: { workoutLog?: any; trainee: any }; // Pass optional workoutLog and required trainee

};
