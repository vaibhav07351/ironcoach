package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type ExerciseService struct {
	repository   *repositories.ExerciseRepository
	categoryRepo *repositories.CategoryRepository
}

// Constructor for ExerciseService
func NewExerciseService() *ExerciseService {
	return &ExerciseService{
		repository:   repositories.NewExerciseRepository(),
		categoryRepo: repositories.NewCategoryRepository(),
	}
}

func (s *ExerciseService) AddExercise(exercise models.Exercise) error {
	// Get category to find trainer ID
	category, err := s.categoryRepo.GetCategoryByID(exercise.CategoryID.Hex())
	if err != nil {
		return errors.New("category does not exist")
	}

	exists, err := s.categoryRepo.IsCategoryExists(exercise.Category, category.TrainerID)
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

	exercise.CreatedAt = time.Now()
	// Add exercise to the database
	return s.repository.AddExercise(exercise)

}

func (s *ExerciseService) GetExercisesByCategory(category string) ([]models.Exercise, error) {
	return s.repository.GetExercisesByCategory(category)
}

func (s *ExerciseService) UpdateExercise(id string, updatedName string) error {
	if err := s.repository.UpdateExercise(id, updatedName); err != nil {
		return err
	}

	// Cascade update in workout logs
	// s.repository.MigrateWorkoutLogs()
	return s.repository.CascadeUpdateExerciseInWorkoutLogs(id, updatedName)
}

func (s *ExerciseService) DeleteExercise(id string) error {
	// Delete the exercise from the exercises collection
	if err := s.repository.DeleteExercise(id); err != nil {
		return err
	}

	// Cascade delete all logs containing this exercise
	return s.repository.CascadeDeleteExerciseFromWorkoutLogs(id)
}
