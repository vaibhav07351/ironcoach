package services

import (
	"math"
	"testing"

	"ironcoach/models"
)

func gymInput(workouts ...models.Workout) models.WorkoutLogInput {
	return models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", Workouts: workouts}
}

func TestNormalizeWorkoutLogInput(t *testing.T) {
	ok := models.Workout{Exercise: "Squats", Sets: 2, Reps: []int{10, 8}, Weight: []float64{60, 70}}

	cases := []struct {
		name    string
		in      models.WorkoutLogInput
		wantErr bool
	}{
		{"valid gym log", gymInput(ok), false},
		{"reps shorter than sets", gymInput(models.Workout{Exercise: "Squats", Sets: 3, Reps: []int{10, 8}, Weight: []float64{60, 70, 80}}), true},
		{"weight shorter than sets", gymInput(models.Workout{Exercise: "Squats", Sets: 2, Reps: []int{10, 8}, Weight: []float64{60}}), true},
		{"zero sets", gymInput(models.Workout{Exercise: "Squats", Sets: 0}), true},
		{"negative reps", gymInput(models.Workout{Exercise: "Squats", Sets: 1, Reps: []int{-1}, Weight: []float64{10}}), true},
		{"NaN weight", gymInput(models.Workout{Exercise: "Squats", Sets: 1, Reps: []int{5}, Weight: []float64{math.NaN()}}), true},
		{"blank exercise name", gymInput(models.Workout{Exercise: "  ", Sets: 1, Reps: []int{5}, Weight: []float64{10}}), true},
		{"bad date", models.WorkoutLogInput{TraineeID: "t1", Date: "12/10/2026", Workouts: []models.Workout{ok}}, true},
		{"ISO timestamp instead of date", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12T05:00:00Z", Workouts: []models.Workout{ok}}, true},
		{"gym with no exercises", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", ActivityType: models.ActivityGym}, true},
		{"sport session with metrics", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", ActivityType: models.ActivityRunning, Metrics: &models.SessionMetrics{DistanceKm: 5, DurationMin: 30}}, false},
		{"sport session without metrics", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", ActivityType: models.ActivityRunning}, true},
		{"unknown activity", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", ActivityType: "curling", Metrics: &models.SessionMetrics{}}, true},
		{"negative distance", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", ActivityType: models.ActivityRunning, Metrics: &models.SessionMetrics{DistanceKm: -1}}, true},
		{"bad client_id", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", Workouts: []models.Workout{ok}, ClientID: "has spaces!"}, true},
		{"good client_id", models.WorkoutLogInput{TraineeID: "t1", Date: "2026-10-12", Workouts: []models.Workout{ok}, ClientID: "3f2b9c1e-aaaa-bbbb"}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := tc.in
			err := normalizeWorkoutLogInput(&in)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tc.wantErr)
			}
			if err != nil && !IsKind(err, KindValidation) {
				t.Fatalf("expected a validation error, got %T %v", err, err)
			}
		})
	}
}

func TestNormalizeDefaultsActivityType(t *testing.T) {
	in := gymInput(models.Workout{Exercise: "Squats", Sets: 1, Reps: []int{5}, Weight: []float64{50}})
	if err := normalizeWorkoutLogInput(&in); err != nil {
		t.Fatal(err)
	}
	if in.ActivityType != models.ActivityGym {
		t.Fatalf("activity type = %q, want gym", in.ActivityType)
	}
}

// Legacy logs may have mismatched arrays or empty sets; summaries must not panic or produce NaN.
func TestProgressToleratesLegacyLogs(t *testing.T) {
	logs := []models.WorkoutLog{
		{Date: "2026-10-01", Workouts: []models.Workout{
			{Exercise: "Bench", Reps: []int{10, 8, 6}, Weight: []float64{50, 55}}, // 3 reps, 2 weights
			{Exercise: "Empty", Reps: nil, Weight: nil},
		}},
		{Date: "2026-10-03", Workouts: []models.Workout{
			{Exercise: "Bench", Reps: []int{5}, Weight: []float64{60}},
		}},
	}

	avg := averageByExercise(logs)
	if _, ok := avg["Empty"]; ok {
		t.Fatal("exercise with no sets should be skipped")
	}
	b := avg["Bench"]
	if math.IsNaN(b.AverageWeight) || math.IsNaN(b.AverageReps) {
		t.Fatalf("NaN in averages: %+v", b)
	}
	// Paired sets: (50x10), (55x8), (60x5) => weight sum 500+440+300 = 1240 over 3 sets.
	if math.Abs(b.AverageWeight-1240.0/3) > 1e-9 {
		t.Fatalf("average weight = %v", b.AverageWeight)
	}

	progress := calculateExerciseProgress(logs)
	if len(progress) != 1 || progress[0].Exercise != "Bench" || len(progress[0].Records) != 3 {
		t.Fatalf("unexpected progress: %+v", progress)
	}
	if progress[0].Records[0].Date > progress[0].Records[2].Date {
		t.Fatal("records should be oldest first")
	}
	if progress[0].MaxWeight != 60 {
		t.Fatalf("max weight = %v, want 60", progress[0].MaxWeight)
	}
}
