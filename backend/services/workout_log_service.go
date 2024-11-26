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
