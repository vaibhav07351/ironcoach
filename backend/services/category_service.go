package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"
)

type CategoryService struct {
	repository   *repositories.CategoryRepository
	exerciseRepo *repositories.ExerciseRepository
}

// Constructor for CategoryService
func NewCategoryService() *CategoryService {
	return &CategoryService{
		repository:   repositories.NewCategoryRepository(),
		exerciseRepo: repositories.NewExerciseRepository(),
	}
}

func (s *CategoryService) AddCategory(category models.Category) error {
	exists, err := s.repository.IsCategoryExists(category.Name, category.TrainerID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("category already exists for this trainer")
	}
	category.CreatedAt = time.Now()
	return s.repository.AddCategory(category)
}

func (s *CategoryService) GetCategories(trainerID string) ([]models.Category, error) {
	return s.repository.GetCategories(trainerID)
}

func (s *CategoryService) UpdateCategory(id string, updatedName string, trainerID string) error {
	// Check if category name already exists for this trainer
	exists, err := s.repository.IsCategoryExists(updatedName, trainerID)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("category already exists for this trainer")
	}

	// Cascade update in exercises
	if err := s.repository.UpdateCategory(id, updatedName); err != nil {
		return err
	}

	// Cascade update in exercises
	if err := s.repository.CascadeUpdateCategoryInExercises(id, updatedName); err != nil {
		return err
	}

	return nil
}

func (s *CategoryService) DeleteCategory(id string) error {
	// Retrieve category name before deletion
	category, err := s.repository.GetCategoryByID(id)
	if err != nil {
		return err
	}
	if err := s.repository.DeleteCategory(id); err != nil {
		return err
	}

	// Cascade delete exercises
	return s.exerciseRepo.DeleteExercisesByCategoryID(category.ID.Hex())
}
