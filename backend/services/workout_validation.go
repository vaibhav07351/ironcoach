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
