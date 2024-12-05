package services

import (
    "ironcoach/models"
    "ironcoach/repositories"
)

type ExerciseService struct {
    repository *repositories.ExerciseRepository
}

// Constructor for ExerciseService
func NewExerciseService() *ExerciseService {
    return &ExerciseService{
        repository: repositories.NewExerciseRepository(),
    }
}

func (s *ExerciseService) AddExercise(exercise models.Exercise) error {
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
