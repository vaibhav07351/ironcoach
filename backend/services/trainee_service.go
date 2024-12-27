package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type TraineeService struct {
    repository *repositories.TraineeRepository
}

// Constructor for TraineeService
func NewTraineeService() *TraineeService {
    return &TraineeService{
        repository: repositories.NewTraineeRepository(),
    }
}

// Add a new trainee
func (s *TraineeService) AddTrainee(trainee models.Trainee) error {
    trainee.CreatedAt=time.Now()
    trainee.UpdatedAt=time.Now()
    return s.repository.CreateTrainee(trainee)
}

// Get all trainees for a trainer
func (s *TraineeService) GetTraineesByTrainer(trainerID string, status string) ([]models.Trainee, error) {
    return s.repository.GetTraineesByTrainer(trainerID, status)
}

// Get trainee of a trainer by ID
func (s *TraineeService) GetTraineeByID(traineeID string) (models.Trainee, error) {
    return s.repository.GetTraineeByID(traineeID)
}


// Update a trainee
func (s *TraineeService) UpdateTrainee(id string, update map[string]interface{}) error {
    update["updated_at"] = time.Now()
    return s.repository.UpdateTrainee(id, update)
}

// Delete a trainee
func (s *TraineeService) DeleteTrainee(id string) error {
    return s.repository.DeleteTrainee(id)
}
