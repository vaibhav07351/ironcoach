package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type TraineeService struct {
	repository     *repositories.TraineeRepository
	categoryService *CategoryService
}

func NewTraineeService() *TraineeService {
	return &TraineeService{
		repository:      repositories.NewTraineeRepository(),
		categoryService: NewCategoryService(),
	}
}

func (s *TraineeService) AddTrainee(trainee models.Trainee) error {
	trainee.CreatedAt = time.Now()
	trainee.UpdatedAt = time.Now()
	id, err := s.repository.CreateTrainee(trainee)
	if err != nil {
		return err
	}
	return s.categoryService.SeedDefaultCatalog(id)
}

func (s *TraineeService) GetTraineesByTrainer(trainerID string, status string) ([]models.Trainee, error) {
	return s.repository.GetTraineesByTrainer(trainerID, status)
}

func (s *TraineeService) GetTraineeByID(traineeID string) (models.Trainee, error) {
	return s.repository.GetTraineeByID(traineeID)
}

func (s *TraineeService) UpdateTrainee(id string, update map[string]interface{}) error {
	update["updated_at"] = time.Now()
	return s.repository.UpdateTrainee(id, update)
}

func (s *TraineeService) DeleteTrainee(id string) error {
	return s.repository.DeleteTrainee(id)
}
