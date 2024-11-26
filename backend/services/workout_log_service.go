package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type WorkoutLogService struct {
	repository *repositories.WorkoutLogRepository
}

// Constructor for WorkoutLogService
func NewWorkoutLogService() *WorkoutLogService {
	return &WorkoutLogService{
		repository: repositories.NewWorkoutLogRepository(),
	}
}

// Add a new workout log
func (s *WorkoutLogService) AddWorkoutLog(log models.WorkoutLog) error {
	// Set timestamps
	log.CreatedAt = time.Now()
	log.UpdatedAt = time.Now()
	return s.repository.CreateWorkoutLog(log)
}

// Get all workout logs for a trainee
func (s *WorkoutLogService) GetWorkoutLogsByTrainee(traineeID string) ([]models.WorkoutLog, error) {
	return s.repository.GetWorkoutLogsByTrainee(traineeID)
}

// Update an existing workout log
func (s *WorkoutLogService) UpdateWorkoutLog(logID string, update map[string]interface{}) error {
	if len(update) == 0 {
		return errors.New("update data cannot be empty")
	}

	// Add an UpdatedAt timestamp to the update data
	update["updated_at"] = time.Now()

	// Call the repository to apply the update
	return s.repository.UpdateWorkoutLog(logID, update)
}

// Delete a workout log
func (s *WorkoutLogService) DeleteWorkoutLog(logID string) error {
	return s.repository.DeleteWorkoutLog(logID)
}


func (s *WorkoutLogService) GetTraineeProgress(traineeID string) (map[string]interface{}, error) {
    logs, err := s.repository.GetWorkoutLogsByTrainee(traineeID)
    if err != nil {
        return nil, err
    }

    // Initialize stats
    progress := make(map[string]interface{})
    exerciseStats := make(map[string]map[string]float64)

    // Calculate metrics for each exercise
    for _, log := range logs {
        for _, workout := range log.Workouts {
            if _, exists := exerciseStats[workout.Exercise]; !exists {
                exerciseStats[workout.Exercise] = map[string]float64{
                    "total_weight": 0,
                    "total_reps":   0,
                    "entry_count":  0,
                }
            }
            for i, reps := range workout.Reps {
                exerciseStats[workout.Exercise]["total_weight"] += workout.Weight[i] * float64(reps)
                exerciseStats[workout.Exercise]["total_reps"] += float64(reps)
                exerciseStats[workout.Exercise]["entry_count"]++
            }
        }
    }

    // Summarize stats
    for exercise, stats := range exerciseStats {
        progress[exercise] = map[string]float64{
            "average_weight": stats["total_weight"] / stats["entry_count"],
            "average_reps":   stats["total_reps"] / stats["entry_count"],
        }
    }

    return progress, nil
}
