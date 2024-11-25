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

func (s *TrainerService) LoginTrainer(email, password string) (token string,err error){
	
	//Find Trainer by email
	trainer, err := s.repository.FindByEmail(email)
	if err!=nil || trainer.Email ==""{
		err=errors.New("invalid email or password")
		return
	} 
	
	//verify password
	if !utils.CheckPassword(trainer.Password,password){
		err=errors.New("invalid email or password")
		return
	}

	//Generate JWT token
	token, err = utils.GenerateJWT(trainer.Email)
	if err!=nil{
		err=errors.New("failed to generate token")
		return
	}

	return 
}