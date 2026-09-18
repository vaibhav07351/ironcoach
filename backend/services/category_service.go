package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CategoryService struct {
	repository   *repositories.CategoryRepository
	exerciseRepo *repositories.ExerciseRepository
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		repository:   repositories.NewCategoryRepository(),
		exerciseRepo: repositories.NewExerciseRepository(),
	}
}

func (s *CategoryService) AddCategory(category models.Category) error {
	if category.TraineeID == "" {
		return errors.New("trainee_id is required")
	}
	exists, err := s.repository.IsCategoryExists(category.Name, category.TraineeID, "")
	if err != nil {
		return err
	}
	if exists {
		return errors.New("category already exists for this trainee")
	}
	now := time.Now()
	category.CreatedAt = now
	category.UpdatedAt = now
	if category.ID.IsZero() {
		category.ID = primitive.NewObjectID()
	}
	return s.repository.AddCategory(category)
}

func (s *CategoryService) GetCategories(traineeID string) ([]models.Category, error) {
	categories, err := s.repository.GetCategoriesByTrainee(traineeID)
	if err != nil {
		return nil, err
	}
	// Existing trainees created before client-scoped catalogs get defaults on first load.
	if len(categories) == 0 {
		if seedErr := s.SeedDefaultCatalog(traineeID); seedErr != nil {
			return nil, seedErr
		}
		return s.repository.GetCategoriesByTrainee(traineeID)
	}
	return categories, nil
}

func (s *CategoryService) UpdateCategory(id string, updatedName string, traineeID string) error {
	category, err := s.repository.GetCategoryByID(id)
	if err != nil {
		return errors.New("category not found")
	}
	if category.TraineeID != traineeID {
		return errors.New("forbidden")
	}

	exists, err := s.repository.IsCategoryExists(updatedName, traineeID, id)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("category already exists for this trainee")
	}

	if err := s.repository.UpdateCategory(id, updatedName); err != nil {
		return err
	}
	return s.repository.CascadeUpdateCategoryInExercises(id, updatedName)
}

func (s *CategoryService) DeleteCategory(id string, traineeID string) error {
	category, err := s.repository.GetCategoryByID(id)
	if err != nil {
		return errors.New("category not found")
	}
	if category.TraineeID != traineeID {
		return errors.New("forbidden")
	}
	if err := s.repository.DeleteCategory(id); err != nil {
		return err
	}
	return s.exerciseRepo.DeleteExercisesByCategoryID(category.ID.Hex())
}

// SeedDefaultCatalog creates the default workout categories/exercises for a trainee.
func (s *CategoryService) SeedDefaultCatalog(traineeID string) error {
	if traineeID == "" {
		return errors.New("trainee_id is required")
	}

	existing, err := s.repository.GetCategoriesByTrainee(traineeID)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	defaultData := []struct {
		CategoryName string
		Exercises    []string
	}{
		{"Abs", []string{"Crunches", "Plank", "Leg Raises", "Russian Twists"}},
		{"Back", []string{"Pull-Ups", "Deadlift", "Lat Pulldowns", "Bent Over Rows"}},
		{"Biceps", []string{"Barbell Curl", "Hammer Curl", "Dumbbell Curls", "Chin-Ups"}},
		{"Chest", []string{"Bench Press", "Push-Ups", "Incline Bench Press", "Dumbbell Flyes"}},
		{"Forearms", []string{"Wrist Curls", "Reverse Wrist Curls", "Farmer's Walk", "Grip Squeeze"}},
		{"Legs", []string{"Squats", "Lunges", "Leg Press", "Calf Raises"}},
		{"Shoulders", []string{"Shoulder Press", "Lateral Raise", "Arnold Press", "Upright Rows"}},
		{"Triceps", []string{"Tricep Dips", "Overhead Extension", "Close-Grip Bench Press", "Tricep Pushdowns"}},
	}

	now := time.Now()
	for _, data := range defaultData {
		category := models.Category{
			ID:        primitive.NewObjectID(),
			Name:      data.CategoryName,
			TraineeID: traineeID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := s.repository.AddCategory(category); err != nil {
			continue
		}
		for _, exerciseName := range data.Exercises {
			exercise := models.Exercise{
				ID:         primitive.NewObjectID(),
				Name:       exerciseName,
				Category:   data.CategoryName,
				CategoryID: category.ID,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			_ = s.exerciseRepo.AddExercise(exercise)
		}
	}
	return nil
}
