package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ExerciseService struct {
	repository   *repositories.ExerciseRepository
	categoryRepo *repositories.CategoryRepository
}

func NewExerciseService() *ExerciseService {
	return &ExerciseService{
		repository:   repositories.NewExerciseRepository(),
		categoryRepo: repositories.NewCategoryRepository(),
	}
}

func (s *ExerciseService) AddExercise(exercise models.Exercise, traineeID string) error {
	if traineeID == "" {
		return errors.New("trainee_id is required")
	}
	if exercise.CategoryID.IsZero() {
		return errors.New("category_id is required")
	}

	category, err := s.categoryRepo.GetCategoryByID(exercise.CategoryID.Hex())
	if err != nil {
		return errors.New("category does not exist")
	}
	if category.TraineeID != traineeID {
		return errors.New("forbidden")
	}

	exercise.Category = category.Name
	exercise.Type = models.NormalizeExerciseType(exercise.Type)
	if !models.IsValidExerciseType(exercise.Type) {
		return ErrValidation("type must be weight_reps, reps, distance_time or time")
	}

	duplicate, err := s.repository.IsExerciseExists(exercise.Name, exercise.CategoryID.Hex())
	if err != nil {
		return err
	}
	if duplicate {
		return errors.New("exercise already exists in this category")
	}

	now := time.Now()
	exercise.CreatedAt = now
	exercise.UpdatedAt = now
	if exercise.ID.IsZero() {
		exercise.ID = primitive.NewObjectID()
	}
	return s.repository.AddExercise(exercise)
}

func (s *ExerciseService) GetExercisesByCategoryID(categoryID string, traineeID string) ([]models.Exercise, error) {
	category, err := s.categoryRepo.GetCategoryByID(categoryID)
	if err != nil {
		return nil, errors.New("category does not exist")
	}
	if category.TraineeID != traineeID {
		return nil, errors.New("forbidden")
	}
	exercises, err := s.repository.GetExercisesByCategoryID(categoryID)
	if err != nil {
		return nil, err
	}
	for i := range exercises {
		exercises[i].Type = models.NormalizeExerciseType(exercises[i].Type)
	}
	return exercises, nil
}

// maxExerciseSearchResults bounds one search response.
const maxExerciseSearchResults = 50

// SearchExercises finds exercises across all of a trainee's categories by name (access is
// checked by the caller).
func (s *ExerciseService) SearchExercises(traineeID, q string) ([]models.Exercise, error) {
	q = strings.TrimSpace(q)
	if err := validateText("q", q, false, 60); err != nil {
		return nil, err
	}
	categories, err := s.categoryRepo.GetCategoriesByTrainee(traineeID)
	if err != nil {
		return nil, err
	}
	ids := make([]primitive.ObjectID, 0, len(categories))
	for _, c := range categories {
		ids = append(ids, c.ID)
	}
	exercises, err := s.repository.SearchInCategories(ids, q, maxExerciseSearchResults)
	if err != nil {
		return nil, err
	}
	for i := range exercises {
		exercises[i].Type = models.NormalizeExerciseType(exercises[i].Type)
	}
	return exercises, nil
}

func (s *ExerciseService) UpdateExercise(id string, updatedName string, traineeID string) error {
	currentExercise, err := s.repository.GetExerciseByID(id)
	if err != nil {
		return errors.New("exercise not found")
	}

	category, err := s.categoryRepo.GetCategoryByID(currentExercise.CategoryID.Hex())
	if err != nil {
		return errors.New("category does not exist")
	}
	if category.TraineeID != traineeID {
		return errors.New("forbidden")
	}

	exists, err := s.repository.IsExerciseExistsInCategory(updatedName, currentExercise.CategoryID.Hex(), id)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("exercise already exists in this category")
	}

	if err := s.repository.UpdateExercise(id, updatedName); err != nil {
		return err
	}
	return s.repository.CascadeUpdateExerciseInWorkoutLogs(id, updatedName)
}

func (s *ExerciseService) DeleteExercise(id string, traineeID string) error {
	currentExercise, err := s.repository.GetExerciseByID(id)
	if err != nil {
		return errors.New("exercise not found")
	}

	category, err := s.categoryRepo.GetCategoryByID(currentExercise.CategoryID.Hex())
	if err != nil {
		return errors.New("category does not exist")
	}
	if category.TraineeID != traineeID {
		return errors.New("forbidden")
	}

	if err := s.repository.DeleteExercise(id); err != nil {
		return err
	}
	return s.repository.CascadeDeleteExerciseFromWorkoutLogs(id)
}
