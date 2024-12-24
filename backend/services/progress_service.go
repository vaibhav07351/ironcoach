package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type ProgressService struct {
	repository        *repositories.ProgressRepository
	workoutLogRepo    *repositories.WorkoutLogRepository
	traineeRepo       *repositories.TraineeRepository
}

func NewProgressService() *ProgressService {
	return &ProgressService{
		repository:        repositories.NewProgressRepository(),
		workoutLogRepo:    repositories.NewWorkoutLogRepository(),
		traineeRepo:       repositories.NewTraineeRepository(),
	}
}

// GetProgress fetches the progress data for a trainee
func (s *ProgressService) GetProgress(traineeID string) (*models.Progress, error) {
	workoutLogs, err := s.workoutLogRepo.GetWorkoutLogsByTrainee(traineeID,"")
	if err != nil {
		return nil, err
	}

	weightBMI, err := s.repository.GetWeightBMIProgress(traineeID)
	if err != nil {
		return nil, err
	}

	exerciseProgress := calculateExerciseProgress(workoutLogs)

	return &models.Progress{
		TraineeID:  traineeID,
		WeightBMI:  weightBMI,
		Exercises:  exerciseProgress,
	}, nil
}

// AddWeightProgress adds a new weight progress entry
func (s *ProgressService) AddWeightProgress(weightBMI models.WeightBMIProgress) error {
	trainee, err := s.traineeRepo.GetTraineeByID(weightBMI.TraineeID)
	if err != nil {
		return err
	}

	// Calculate BMI if height is available
	if trainee.Height > 0 {
		weightBMI.BMI = weightBMI.Weight / ((trainee.Height / 100) * (trainee.Height / 100))
	}

	weightBMI.CreatedAt = time.Now()
	weightBMI.UpdatedAt = time.Now()

	return s.repository.AddWeightProgress(weightBMI)
}

func calculateExerciseProgress(workoutLogs []models.WorkoutLog) []models.ExerciseProgress {
	exerciseMap := map[string][]models.ExerciseRecord{}
	for _, log := range workoutLogs {
		for _, workout := range log.Workouts {
			for i, weight := range workout.Weight {
				record := models.ExerciseRecord{
					Date:   log.Date,
					Weight: weight,
					Reps:   workout.Reps[i],
				}
				exerciseMap[workout.Exercise] = append(exerciseMap[workout.Exercise], record)
			}
		}
	}

	var exercises []models.ExerciseProgress
	for name, records := range exerciseMap {
		var totalWeight float64
		for _, r := range records {
			totalWeight += r.Weight
		}

		exercises = append(exercises, models.ExerciseProgress{
			Exercise:  name,
			MaxWeight: maxWeight(records),
			AvgWeight: totalWeight / float64(len(records)),
			Records:   records,
		})
	}
	return exercises
}

func maxWeight(records []models.ExerciseRecord) float64 {
	max := 0.0
	for _, r := range records {
		if r.Weight > max {
			max = r.Weight
		}
	}
	return max
}
