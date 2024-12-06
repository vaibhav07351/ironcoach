package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
)

type CategoryService struct {
    repository *repositories.CategoryRepository
    exerciseRepo *repositories.ExerciseRepository
}

// Constructor for CategoryService
func NewCategoryService() *CategoryService {
    return &CategoryService{
        repository: repositories.NewCategoryRepository(),
        exerciseRepo: repositories.NewExerciseRepository(),
    }
}


func (s *CategoryService) AddCategory(category models.Category) error {
    exists, err := s.repository.IsCategoryExists(category.Name)
    if err != nil {
        return err
    }
    if exists {
        return errors.New("category already exists")
    }
    return s.repository.AddCategory(category)
}


func (s *CategoryService) GetCategories() ([]models.Category, error) {
    return s.repository.GetCategories()
}

func (s *CategoryService) UpdateCategory(id string, updatedName string) error {
    return s.repository.UpdateCategory(id, updatedName)
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
    return s.exerciseRepo.DeleteExercisesByCategory(category.Name)
}
