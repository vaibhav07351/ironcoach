package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CategoryService struct {
	repository   *repositories.CategoryRepository
	exerciseRepo *repositories.ExerciseRepository
	traineeRepo  *repositories.TraineeRepository
}

func NewCategoryService() *CategoryService {
	return &CategoryService{
		repository:   repositories.NewCategoryRepository(),
		exerciseRepo: repositories.NewExerciseRepository(),
		traineeRepo:  repositories.NewTraineeRepository(),
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

// GetCategories lists a trainee's categories. A trainee whose default catalog was never seeded
// (created before per-client catalogs, or seeding failed at creation) is seeded once here; after
// that, an empty list stays empty if the client deleted everything.
func (s *CategoryService) GetCategories(traineeID string) ([]models.Category, error) {
	categories, err := s.repository.GetCategoriesByTrainee(traineeID)
	if err != nil {
		return nil, err
	}
	if len(categories) > 0 {
		return categories, nil
	}
	if err := s.SeedDefaultCatalog(traineeID); err != nil {
		return nil, err
	}
	return s.repository.GetCategoriesByTrainee(traineeID)
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

// SeedDefaultCatalog creates the default workout categories and exercises for a trainee, at most
// once per trainee (guarded by an atomic flag on the trainee), in two bulk inserts.
func (s *CategoryService) SeedDefaultCatalog(traineeID string) error {
	if traineeID == "" {
		return errors.New("trainee_id is required")
	}
	claimed, err := s.traineeRepo.ClaimCatalogSeed(traineeID)
	if err != nil || !claimed {
		return err
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
	categories := make([]models.Category, 0, len(defaultData))
	var exercises []models.Exercise
	for _, data := range defaultData {
		category := models.Category{
			ID:        primitive.NewObjectID(),
			Name:      data.CategoryName,
			TraineeID: traineeID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		categories = append(categories, category)
		for _, exerciseName := range data.Exercises {
			exercises = append(exercises, models.Exercise{
				ID:         primitive.NewObjectID(),
				Name:       exerciseName,
				Category:   data.CategoryName,
				CategoryID: category.ID,
				CreatedAt:  now,
				UpdatedAt:  now,
			})
		}
	}

	if err := s.repository.AddMany(categories); err != nil {
		if relErr := s.traineeRepo.ReleaseCatalogSeed(traineeID); relErr != nil {
			slog.Error("release catalog seed flag failed", "trainee_id", traineeID, "err", relErr)
		}
		return err
	}
	return s.exerciseRepo.AddMany(exercises)
}
