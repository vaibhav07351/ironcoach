package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
)

type ExerciseService struct {
	repository   *repositories.ExerciseRepository
	categoryRepo *repositories.CategoryRepository
}

// Constructor for ExerciseService
func NewExerciseService() *ExerciseService {
	return &ExerciseService{
		repository: repositories.NewExerciseRepository(),
		categoryRepo: repositories.NewCategoryRepository(),
	}
}

func (s *ExerciseService) AddExercise(exercise models.Exercise) error {
	exists, err := s.categoryRepo.IsCategoryExists(exercise.Category)
	if err != nil {
	    return err
	}
	if !exists {
	    return errors.New("category does not exist")
	}

    // Check if the exercise already exists
    duplicate, err := s.repository.IsExerciseExists(exercise.Name, exercise.Category)
    if err != nil {
        return err
    }
    if duplicate {
        return errors.New("exercise already exists in this category")
    }

    // Add exercise to the database
    return s.repository.AddExercise(exercise)
	
}

func (s *ExerciseService) GetExercisesByCategory(category string) ([]models.Exercise, error) {
	return s.repository.GetExercisesByCategory(category)
}

func (s *ExerciseService) UpdateExercise(id string, updatedName string) error {
	return s.repository.UpdateExercise(id, updatedName)
}

func (s *ExerciseService) DeleteExercise(id string) error {
	return s.repository.DeleteExercise(id)
}