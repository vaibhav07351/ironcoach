package services

import (
    "time"
    "ironcoach/models"
    "ironcoach/repositories"
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
