package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"sort"
	"time"
)

// maxWeightEntries bounds the weight history returned for charts (about a year of daily entries).
const maxWeightEntries = 366

type ProgressService struct {
	repository     *repositories.ProgressRepository
	workoutLogRepo *repositories.WorkoutLogRepository
	access         *AccessService
}

func NewProgressService() *ProgressService {
	return &ProgressService{
		repository:     repositories.NewProgressRepository(),
		workoutLogRepo: repositories.NewWorkoutLogRepository(),
		access:         NewAccessService(),
	}
}

// GetProgress returns weight history and per-exercise records from recent logs
// (access is enforced by the route middleware).
func (s *ProgressService) GetProgress(traineeID string) (*models.Progress, error) {
	workoutLogs, err := s.workoutLogRepo.GetWorkoutLogsByTrainee(traineeID, "", progressLogWindow, 0)
	if err != nil {
		return nil, err
	}
	weightBMI, err := s.repository.GetWeightBMIProgress(traineeID, maxWeightEntries)
	if err != nil {
		return nil, err
	}
	return &models.Progress{
		TraineeID: traineeID,
		WeightBMI: weightBMI,
		Exercises: calculateExerciseProgress(workoutLogs),
	}, nil
}

// AddWeightProgress records the day's weight for a trainee the caller may access, computing
// BMI from the trainee's height when known.
func (s *ProgressService) AddWeightProgress(p Principal, in models.WeightBMIProgress) error {
	if err := validateDate("date", in.Date); err != nil {
		return err
	}
	if err := validateNotFuture("date", in.Date, p.Location(), time.Now()); err != nil {
		return err
	}
	if err := validateNumber("weight", in.Weight, 1, 500); err != nil {
		return err
	}
	if err := validateNumber("body_fat", in.BodyFat, 0, 80); err != nil {
		return err
	}
	trainee, err := s.access.AuthorizeTrainee(p, in.TraineeID)
	if err != nil {
		return err
	}

	in.BMI = 0
	if trainee.Height > 0 {
		m := trainee.Height / 100
		in.BMI = in.Weight / (m * m)
	}
	return s.repository.UpsertWeightProgress(in)
}

// calculateExerciseProgress builds per-exercise records, pairing reps and weight only where both
// exist (legacy logs may have mismatched arrays).
func calculateExerciseProgress(workoutLogs []models.WorkoutLog) []models.ExerciseProgress {
	exerciseMap := map[string][]models.ExerciseRecord{}
	for _, log := range workoutLogs {
		for _, workout := range log.Workouts {
			n := len(workout.Weight)
			if len(workout.Reps) < n {
				n = len(workout.Reps)
			}
			for i := 0; i < n; i++ {
				exerciseMap[workout.Exercise] = append(exerciseMap[workout.Exercise], models.ExerciseRecord{
					Date:   log.Date,
					Weight: workout.Weight[i],
					Reps:   workout.Reps[i],
				})
			}
		}
	}

	exercises := make([]models.ExerciseProgress, 0, len(exerciseMap))
	for name, records := range exerciseMap {
		// Logs arrive newest first; charts expect oldest first.
		sort.SliceStable(records, func(i, j int) bool { return records[i].Date < records[j].Date })
		var total, max float64
		for _, r := range records {
			total += r.Weight
			if r.Weight > max {
				max = r.Weight
			}
		}
		exercises = append(exercises, models.ExerciseProgress{
			Exercise:  name,
			MaxWeight: max,
			AvgWeight: total / float64(len(records)),
			Records:   records,
		})
	}
	sort.Slice(exercises, func(i, j int) bool { return exercises[i].Exercise < exercises[j].Exercise })
	return exercises
}
