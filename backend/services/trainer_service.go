package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
)

type TrainerService struct {
	repository *repositories.TrainerRepository
}

// constructor for TrainerService
func NewTrainerService() *TrainerService {
	return &TrainerService{
		repository: repositories.NewTrainerRepository(),
	}
}

// Register a new Trainer
func (s *TrainerService) RegisterTrainer(trainer models.Trainer) error {

	existingTrainer, _ := s.repository.FindByEmail(trainer.Email)
	if existingTrainer.Email != "" {
		return errors.New("trainer with this email already exists")
	}

	//Hash the password
	hashedPassword, err := utils.HashPassword(trainer.Password)
	if err != nil {
		return err
	}

	trainer.Password = hashedPassword

	//save trainer to database
	return s.repository.CreateTrainer(trainer)

}
