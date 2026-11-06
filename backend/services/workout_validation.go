package services

import (
	"fmt"
	"ironcoach/models"
)

const (
	maxWorkoutsPerLog = 40
	maxSetsPerWorkout = 50
)

// validateWorkouts checks each exercise entry. sets, reps and weight must line up one entry
// per set; mismatched arrays previously crashed the progress calculations.
func validateWorkouts(workouts []models.Workout) error {
	if len(workouts) > maxWorkoutsPerLog {
		return ErrValidation(fmt.Sprintf("a log can have at most %d exercises", maxWorkoutsPerLog))
	}
	for i, w := range workouts {
		label := fmt.Sprintf("exercise %d", i+1)
		if err := validateText(label+" name", w.Exercise, true, 100); err != nil {
			return err
		}
		if w.Sets < 1 || w.Sets > maxSetsPerWorkout {
			return ErrValidation(fmt.Sprintf("%s must have between 1 and %d sets", label, maxSetsPerWorkout))
		}
		if len(w.Reps) != w.Sets || len(w.Weight) != w.Sets {
			return ErrValidation(fmt.Sprintf("%s needs one reps and one weight value per set", label))
		}
		for j := 0; j < w.Sets; j++ {
			if w.Reps[j] < 0 || w.Reps[j] > 1000 {
				return ErrValidation(fmt.Sprintf("%s set %d reps must be between 0 and 1000", label, j+1))
			}
			if err := validateNumber(fmt.Sprintf("%s set %d weight", label, j+1), w.Weight[j], 0, 1000); err != nil {
				return err
			}
		}
		if err := validateText(label+" notes", w.Notes, false, 500); err != nil {
			return err
		}
	}
	return nil
}

func validateMetrics(m *models.SessionMetrics) error {
	if m == nil {
		return nil
	}
	checks := []struct {
		field  string
		v, max float64
	}{
		{"duration_min", m.DurationMin, 24 * 60},
		{"distance_m", m.DistanceM, 500_000},
		{"distance_km", m.DistanceKm, 500},
		{"laps", float64(m.Laps), 10_000},
		{"games_won", float64(m.GamesWon), 1000},
		{"games_lost", float64(m.GamesLost), 1000},
		{"rounds", float64(m.Rounds), 1000},
	}
	for _, c := range checks {
		if err := validateNumber(c.field, c.v, 0, c.max); err != nil {
			return err
		}
	}
	for field, v := range map[string]string{
		"stroke": m.Stroke, "intensity": m.Intensity, "style": m.Style,
		"session_kind": m.SessionKind, "title": m.Title, "role_note": m.RoleNote,
	} {
		if err := validateText(field, v, false, 200); err != nil {
			return err
		}
	}
	return nil
}

// normalizeWorkoutLogInput applies defaults and validates a new log.
func normalizeWorkoutLogInput(in *models.WorkoutLogInput) error {
	if in.ActivityType == "" {
		if len(in.Workouts) > 0 {
			in.ActivityType = models.ActivityGym
		} else {
			in.ActivityType = models.ActivityOther
		}
	}
	if !models.IsValidActivityType(in.ActivityType) {
		return ErrValidation("activity_type is not supported")
	}
	if err := validateDate("date", in.Date); err != nil {
		return err
	}
	if in.ActivityType == models.ActivityGym && len(in.Workouts) == 0 {
		return ErrValidation("gym sessions need at least one exercise")
	}
	if in.ActivityType != models.ActivityGym && in.Metrics == nil {
		return ErrValidation("sport sessions need session details")
	}
	if err := validateWorkouts(in.Workouts); err != nil {
		return err
	}
	if err := validateMetrics(in.Metrics); err != nil {
		return err
	}
	if err := validateText("notes", in.Notes, false, 2000); err != nil {
		return err
	}
	return validateClientID(in.ClientID)
}

const (
	maxSetWeightKg  = 1000
	maxSetReps      = 1000
	maxSetDistanceM = 500_000
	maxSetDurationS = 24 * 60 * 60
	maxSetNoteLen   = 200
)

// validateSetEntries checks one exercise's sets for its type and clears fields the type does
// not use, so stray values (e.g. reps on a treadmill run) never reach the stats.
func validateSetEntries(exerciseType string, entries []models.SetEntry) error {
	if len(entries) > maxSetsPerWorkout {
		return ErrValidation(fmt.Sprintf("an exercise can have at most %d sets", maxSetsPerWorkout))
	}
	for i := range entries {
		e := &entries[i]
		label := fmt.Sprintf("set %d", i+1)
		if err := validateText(label+" note", e.Note, false, maxSetNoteLen); err != nil {
			return err
		}
		if err := validateNumber(label+" weight", e.WeightKg, 0, maxSetWeightKg); err != nil {
			return err
		}
		if e.Reps < 0 || e.Reps > maxSetReps {
			return ErrValidation(fmt.Sprintf("%s reps must be between 0 and %d", label, maxSetReps))
		}
		if err := validateNumber(label+" distance", e.DistanceM, 0, maxSetDistanceM); err != nil {
			return err
		}
		if e.DurationS < 0 || e.DurationS > maxSetDurationS {
			return ErrValidation(label + " time must be under 24 hours")
		}

		switch exerciseType {
		case models.ExerciseWeightReps, models.ExerciseReps:
			if e.Reps < 1 {
				return ErrValidation(label + " needs at least 1 rep")
			}
			e.DistanceM, e.DurationS = 0, 0
		case models.ExerciseDistanceTime:
			if e.DistanceM <= 0 && e.DurationS <= 0 {
				return ErrValidation(label + " needs a distance or a time")
			}
			e.WeightKg, e.Reps = 0, 0
		case models.ExerciseTime:
			if e.DurationS <= 0 {
				return ErrValidation(label + " needs a time")
			}
			e.Reps, e.DistanceM = 0, 0
		default:
			return ErrValidation("unknown exercise type")
		}
	}
	return nil
}

// workoutFromEntries builds the stored exercise entry, mirroring sets into the legacy parallel
// arrays so readers that predate Entries keep working.
func workoutFromEntries(exercise models.Exercise, entries []models.SetEntry) models.Workout {
	reps := make([]int, len(entries))
	weight := make([]float64, len(entries))
	for i, e := range entries {
		reps[i] = e.Reps
		weight[i] = e.WeightKg
	}
	return models.Workout{
		Exercise:   exercise.Name,
		ExerciseID: exercise.ID,
		Type:       exercise.Type,
		Sets:       len(entries),
		Reps:       reps,
		Weight:     weight,
		Entries:    entries,
	}
}

// activityForExercise tags a log with cardio for distance/time exercises and gym otherwise, so
// "trained today: cardio" reads right.
func activityForExercise(exerciseType string) string {
	if exerciseType == models.ExerciseDistanceTime {
		return models.ActivityCardio
	}
	return models.ActivityGym
}
