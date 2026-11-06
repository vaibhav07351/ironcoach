package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// exerciseHistoryCap bounds how many days of one exercise feed bests and graphs (about three years
// of daily training). History pages are read separately and are not capped by this.
const exerciseHistoryCap = 1000

// ExerciseLogService is the per-exercise logging flow: today's sets of one exercise (Track),
// its past sessions (History) and its graphs and records (Graph).
type ExerciseLogService struct {
	logs       *repositories.WorkoutLogRepository
	exercises  *repositories.ExerciseRepository
	categories *repositories.CategoryRepository
	access     *AccessService
}

func NewExerciseLogService() *ExerciseLogService {
	return &ExerciseLogService{
		logs:       repositories.NewWorkoutLogRepository(),
		exercises:  repositories.NewExerciseRepository(),
		categories: repositories.NewCategoryRepository(),
		access:     NewAccessService(),
	}
}

// authorize checks the caller may access the trainee and loads the trainee's exercise.
func (s *ExerciseLogService) authorize(p Principal, traineeID, exerciseID string) (models.Exercise, error) {
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return models.Exercise{}, err
	}
	return loadTraineeExercise(s.exercises, s.categories, traineeID, exerciseID)
}

// priorBests returns the sessions of an exercise before a date (oldest first) and their bests.
func (s *ExerciseLogService) priorBests(traineeID string, exercise models.Exercise, date string) ([]models.ExerciseSession, models.ExerciseBests, []models.RepRecord, error) {
	logs, err := s.logs.FindByExercise(repositories.ExerciseLogQuery{
		TraineeID: traineeID, ExerciseID: exercise.ID, Before: date, Limit: exerciseHistoryCap,
	})
	if err != nil {
		return nil, models.ExerciseBests{}, nil, err
	}
	sessions := sessionsForExercise(logs, exercise.ID.Hex())
	bests, records := computeBests(sessions)
	return sessions, bests, records, nil
}

// GetDay returns one exercise's sets on a day, the previous session (for pre-filling and the
// "last time" line) and which of the day's sets are personal records.
func (s *ExerciseLogService) GetDay(p Principal, traineeID, exerciseID, date string) (models.ExerciseDay, error) {
	if err := validateDate("date", date); err != nil {
		return models.ExerciseDay{}, err
	}
	exercise, err := s.authorize(p, traineeID, exerciseID)
	if err != nil {
		return models.ExerciseDay{}, err
	}
	log, err := s.logs.FindExerciseDay(traineeID, date, exercise.ID.Hex())
	if err != nil {
		return models.ExerciseDay{}, err
	}
	prior, bests, records, err := s.priorBests(traineeID, exercise, date)
	if err != nil {
		return models.ExerciseDay{}, err
	}

	out := models.ExerciseDay{Exercise: exercise, Log: log, PRFlags: []bool{}}
	if len(prior) > 0 {
		last := prior[len(prior)-1]
		out.Previous = &last
	}
	if log != nil && len(log.Workouts) > 0 {
		out.PRFlags = prFlags(exercise.Type, models.EntriesOf(log.Workouts[0]), bests, records)
	}
	return out, nil
}

// SaveDay replaces all sets of one exercise on a day (the app sends the full list after every
// add, edit or delete, so a retried request is harmless). An empty list removes the exercise
// from that day.
func (s *ExerciseLogService) SaveDay(p Principal, traineeID, exerciseID, date string, in models.ExerciseDayInput) (models.ExerciseDaySaved, error) {
	if err := validateDate("date", date); err != nil {
		return models.ExerciseDaySaved{}, err
	}
	if err := validateNotFuture("date", date, p.Location(), time.Now()); err != nil {
		return models.ExerciseDaySaved{}, err
	}
	if err := validateText("notes", in.Notes, false, 2000); err != nil {
		return models.ExerciseDaySaved{}, err
	}
	exercise, err := s.authorize(p, traineeID, exerciseID)
	if err != nil {
		return models.ExerciseDaySaved{}, err
	}
	entries := in.Entries
	if entries == nil {
		entries = []models.SetEntry{}
	}
	if err := validateSetEntries(exercise.Type, entries); err != nil {
		return models.ExerciseDaySaved{}, err
	}

	key := exercise.ID.Hex()
	if len(entries) == 0 {
		if err := s.logs.DeleteExerciseDay(traineeID, date, key); err != nil {
			return models.ExerciseDaySaved{}, err
		}
		return models.ExerciseDaySaved{PRFlags: []bool{}}, nil
	}

	log, err := s.logs.UpsertExerciseDay(traineeID, date, key, bson.M{
		"activity_type": activityForExercise(exercise.Type),
		"workouts":      []models.Workout{workoutFromEntries(exercise, entries)},
		"notes":         in.Notes,
	})
	if err != nil {
		return models.ExerciseDaySaved{}, err
	}
	_, bests, records, err := s.priorBests(traineeID, exercise, date)
	if err != nil {
		// The sets are saved; only the trophies are missing, and they show on the next load.
		slog.Warn("pr check after save failed", "trainee_id", traineeID, "exercise_id", key, "err", err)
		return models.ExerciseDaySaved{Log: &log, PRFlags: make([]bool, len(entries))}, nil
	}
	flags := prFlags(exercise.Type, entries, bests, records)
	return models.ExerciseDaySaved{Log: &log, PRFlags: flags, NewPR: anyTrue(flags)}, nil
}

// History lists an exercise's past sessions, newest first. before (optional, YYYY-MM-DD) only
// returns sessions before that date. Pages are counted in logs, so on the rare day split across
// an old and a new log a session can continue on the next page (the app merges equal dates).
func (s *ExerciseLogService) History(p Principal, traineeID, exerciseID, before string, page Pagination) ([]models.ExerciseSession, error) {
	if before != "" {
		if err := validateDate("before", before); err != nil {
			return nil, err
		}
	}
	exercise, err := s.authorize(p, traineeID, exerciseID)
	if err != nil {
		return nil, err
	}
	logs, err := s.logs.FindByExercise(repositories.ExerciseLogQuery{
		TraineeID: traineeID, ExerciseID: exercise.ID, Before: before, Limit: page.Limit, Offset: page.Offset,
	})
	if err != nil {
		return nil, err
	}
	sessions := sessionsForExercise(logs, exercise.ID.Hex())
	for i, j := 0, len(sessions)-1; i < j; i, j = i+1, j-1 {
		sessions[i], sessions[j] = sessions[j], sessions[i]
	}
	return sessions, nil
}

// Stats returns the Graph data for an exercise over a range (1m, 3m, 6m, 1y, all).
func (s *ExerciseLogService) Stats(p Principal, traineeID, exerciseID, rangeKey string) (models.ExerciseStats, error) {
	if rangeKey == "" {
		rangeKey = "3m"
	}
	if !IsValidStatsRange(rangeKey) {
		return models.ExerciseStats{}, ErrValidation("range must be 1m, 3m, 6m, 1y or all")
	}
	exercise, err := s.authorize(p, traineeID, exerciseID)
	if err != nil {
		return models.ExerciseStats{}, err
	}
	logs, err := s.logs.FindByExercise(repositories.ExerciseLogQuery{
		TraineeID: traineeID, ExerciseID: exercise.ID, Limit: exerciseHistoryCap,
	})
	if err != nil {
		return models.ExerciseStats{}, err
	}
	from := ""
	if days, ok := rangeDays[rangeKey]; ok {
		from = localDate(time.Now().AddDate(0, 0, -days), p.Location())
	}
	return buildExerciseStats(exercise.Type, rangeKey, from, sessionsForExercise(logs, exercise.ID.Hex())), nil
}

// maxActivityMixDays bounds the activity-mix window.
const maxActivityMixDays = 365

// ActivityMix counts the days each activity was logged in the last `days` days (access is
// enforced by the route middleware). The app uses it to suggest adding a frequent activity.
func (s *ExerciseLogService) ActivityMix(p Principal, traineeID string, days int) ([]models.ActivityCount, error) {
	if days <= 0 {
		days = 30
	}
	if days > maxActivityMixDays {
		return nil, ErrValidation("days must be at most 365")
	}
	since := localDate(time.Now().AddDate(0, 0, -days), p.Location())
	return s.logs.ActivityDayCounts(traineeID, since)
}

// maxLoggedDatesSpanDays bounds one calendar request (a month view needs about 31 days).
const maxLoggedDatesSpanDays = 62

// LoggedDates lists the days with any log in [from, to] for the workout calendar (access is
// enforced by the route middleware).
func (s *ExerciseLogService) LoggedDates(traineeID, from, to string) ([]string, error) {
	if err := validateDate("from", from); err != nil {
		return nil, err
	}
	if err := validateDate("to", to); err != nil {
		return nil, err
	}
	f, _ := time.Parse(dateLayout, from)
	t, _ := time.Parse(dateLayout, to)
	if t.Before(f) || t.Sub(f) > maxLoggedDatesSpanDays*24*time.Hour {
		return nil, ErrValidation("from must be before to, at most 62 days apart")
	}
	return s.logs.LoggedDates(traineeID, from, to)
}
