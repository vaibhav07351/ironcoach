package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// progressLogWindow bounds how many recent logs feed the progress summaries.
const progressLogWindow = 500

type WorkoutLogService struct {
	repository *repositories.WorkoutLogRepository
	access     *AccessService
}

// Constructor for WorkoutLogService
func NewWorkoutLogService() *WorkoutLogService {
	return &WorkoutLogService{
		repository: repositories.NewWorkoutLogRepository(),
		access:     NewAccessService(),
	}
}

// AddWorkoutLog creates a log for a trainee the caller may access. With a client_id, a repeat of
// the same request returns the original log (created=false) instead of a duplicate.
func (s *WorkoutLogService) AddWorkoutLog(p Principal, in models.WorkoutLogInput) (models.WorkoutLog, bool, error) {
	if err := normalizeWorkoutLogInput(&in); err != nil {
		return models.WorkoutLog{}, false, err
	}
	if err := validateNotFuture("date", in.Date, p.Location(), time.Now()); err != nil {
		return models.WorkoutLog{}, false, err
	}
	if _, err := s.access.AuthorizeTrainee(p, in.TraineeID); err != nil {
		return models.WorkoutLog{}, false, err
	}

	now := time.Now().UTC()
	log := models.WorkoutLog{
		TraineeID:    in.TraineeID,
		Date:         in.Date,
		ActivityType: in.ActivityType,
		Workouts:     in.Workouts,
		Metrics:      in.Metrics,
		Notes:        in.Notes,
		ClientID:     in.ClientID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	return s.repository.CreateWorkoutLog(log)
}

// GetWorkoutLogsByTrainee lists logs (access is enforced by the route middleware).
func (s *WorkoutLogService) GetWorkoutLogsByTrainee(traineeID, date string, page Pagination) ([]models.WorkoutLog, error) {
	if date != "" {
		if err := validateDate("date", date); err != nil {
			return nil, err
		}
	}
	return s.repository.GetWorkoutLogsByTrainee(traineeID, date, page.Limit, page.Offset)
}

// loadAuthorized fetches a log and checks the caller may access its trainee.
func (s *WorkoutLogService) loadAuthorized(p Principal, logID string) (models.WorkoutLog, error) {
	log, err := s.repository.FindByID(logID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return log, ErrNotFound("workout log")
		}
		return log, err
	}
	if _, err := s.access.AuthorizeTrainee(p, log.TraineeID); err != nil {
		return log, err
	}
	return log, nil
}

// UpdateWorkoutLog edits the provided fields of a log the caller may access.
func (s *WorkoutLogService) UpdateWorkoutLog(p Principal, logID string, in models.WorkoutLogUpdate) error {
	log, err := s.loadAuthorized(p, logID)
	if err != nil {
		return err
	}

	set := bson.M{}
	if in.Date != nil {
		if err := validateDate("date", *in.Date); err != nil {
			return err
		}
		if err := validateNotFuture("date", *in.Date, p.Location(), time.Now()); err != nil {
			return err
		}
		set["date"] = *in.Date
	}
	if in.Workouts != nil {
		if log.ActivityType == models.ActivityGym && len(*in.Workouts) == 0 {
			return ErrValidation("gym sessions need at least one exercise")
		}
		if err := validateWorkouts(*in.Workouts); err != nil {
			return err
		}
		set["workouts"] = *in.Workouts
	}
	if in.Metrics != nil {
		if err := validateMetrics(in.Metrics); err != nil {
			return err
		}
		set["metrics"] = in.Metrics
	}
	if in.Notes != nil {
		if err := validateText("notes", *in.Notes, false, 2000); err != nil {
			return err
		}
		set["notes"] = *in.Notes
	}
	if len(set) == 0 {
		return ErrValidation("nothing to update")
	}
	set["updated_at"] = time.Now().UTC()

	found, err := s.repository.UpdateFields(logID, set)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("workout log")
	}
	return nil
}

// DeleteWorkoutLog removes a log the caller may access.
func (s *WorkoutLogService) DeleteWorkoutLog(p Principal, logID string) error {
	if _, err := s.loadAuthorized(p, logID); err != nil {
		return err
	}
	found, err := s.repository.DeleteWorkoutLog(logID)
	if err != nil {
		return err
	}
	if !found {
		return ErrNotFound("workout log")
	}
	return nil
}

// ExerciseAverage is the per-exercise summary returned by GetTraineeProgress.
type ExerciseAverage struct {
	AverageWeight float64 `json:"average_weight"`
	AverageReps   float64 `json:"average_reps"`
}

// GetTraineeProgress averages weight and reps per exercise over recent logs.
func (s *WorkoutLogService) GetTraineeProgress(traineeID string) (map[string]ExerciseAverage, error) {
	logs, err := s.repository.GetWorkoutLogsByTrainee(traineeID, "", progressLogWindow, 0)
	if err != nil {
		return nil, err
	}
	return averageByExercise(logs), nil
}

// averageByExercise tolerates legacy logs whose reps/weight arrays have different lengths by
// only pairing indexes present in both, and skips exercises with no sets (no division by zero).
func averageByExercise(logs []models.WorkoutLog) map[string]ExerciseAverage {
	type totals struct{ weight, reps, sets float64 }
	acc := map[string]*totals{}
	for _, log := range logs {
		for _, w := range log.Workouts {
			n := len(w.Reps)
			if len(w.Weight) < n {
				n = len(w.Weight)
			}
			if n == 0 {
				continue
			}
			t, ok := acc[w.Exercise]
			if !ok {
				t = &totals{}
				acc[w.Exercise] = t
			}
			for i := 0; i < n; i++ {
				t.weight += w.Weight[i] * float64(w.Reps[i])
				t.reps += float64(w.Reps[i])
				t.sets++
			}
		}
	}
	out := make(map[string]ExerciseAverage, len(acc))
	for name, t := range acc {
		out[name] = ExerciseAverage{
			AverageWeight: t.weight / t.sets,
			AverageReps:   t.reps / t.sets,
		}
	}
	return out
}
