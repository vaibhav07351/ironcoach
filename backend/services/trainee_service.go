package services

import (
    "ironcoach/models"
    "ironcoach/repositories"
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
    return s.repository.CreateTrainee(trainee)
}

// Get all trainees for a trainer
func (s *TraineeService) GetTraineesByTrainer(trainerID string) ([]models.Trainee, error) {
    return s.repository.GetTraineesByTrainer(trainerID)
}

// Update a trainee
func (s *TraineeService) UpdateTrainee(id string, update map[string]interface{}) error {
    return s.repository.UpdateTrainee(id, update)
}

// Delete a trainee
func (s *TraineeService) DeleteTrainee(id string) error {
    return s.repository.DeleteTrainee(id)
}
