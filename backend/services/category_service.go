package services

import (
    "ironcoach/models"
    "ironcoach/repositories"
)

type CategoryService struct {
    repository *repositories.CategoryRepository
}

// Constructor for CategoryService
func NewCategoryService() *CategoryService {
    return &CategoryService{
        repository: repositories.NewCategoryRepository(),
    }
}


func (s *CategoryService) AddCategory(category models.Category) error {
    return s.repository.AddCategory(category)
}

func (s *CategoryService) GetCategories() ([]models.Category, error) {
    return s.repository.GetCategories()
}

func (s *CategoryService) UpdateCategory(id string, updatedName string) error {
    return s.repository.UpdateCategory(id, updatedName)
}

func (s *CategoryService) DeleteCategory(id string) error {
    return s.repository.DeleteCategory(id)
}
