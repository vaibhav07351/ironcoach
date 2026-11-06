package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"log/slog"
	"sort"
	"strings"
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
		categories, err = s.ensureCardio(traineeID, categories)
		if err != nil {
			// The catalog itself loaded; a failed Cardio back-fill is retried on the next load.
			slog.Warn("add cardio category failed", "trainee_id", traineeID, "err", err)
		}
		sortCategories(categories)
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

// catalogSeedCategory is one default category and its exercises. Exercises not listed in
// exerciseTypes are weight x reps.
type catalogSeedCategory struct {
	Name      string
	Exercises []string
}

var defaultCatalog = []catalogSeedCategory{
	{"Abs", []string{"Crunches", "Plank", "Leg Raises", "Russian Twists"}},
	{"Back", []string{"Pull-Ups", "Deadlift", "Lat Pulldowns", "Bent Over Rows", "Seated Cable Row"}},
	{"Biceps", []string{"Barbell Curl", "Hammer Curl", "Dumbbell Curls", "Chin-Ups"}},
	{"Cardio", cardioExercises},
	{"Chest", []string{"Bench Press", "Push-Ups", "Incline Bench Press", "Dumbbell Flyes"}},
	{"Forearms", []string{"Wrist Curls", "Reverse Wrist Curls", "Farmer's Walk", "Grip Squeeze"}},
	{"Legs", []string{"Squats", "Lunges", "Leg Press", "Calf Raises"}},
	{"Shoulders", []string{"Shoulder Press", "Lateral Raise", "Arnold Press", "Upright Rows"}},
	{"Triceps", []string{"Tricep Dips", "Overhead Extension", "Close-Grip Bench Press", "Tricep Pushdowns"}},
}

const cardioCategoryName = "Cardio"

var cardioExercises = []string{
	"Running (Treadmill)", "Running (Outdoor)", "Walking", "Cycling", "Stationary Bike",
	"Rowing Machine", "Elliptical Trainer", "Stair Climber", "Swimming",
}

// exerciseTypes gives the non-default type of seeded exercises.
var exerciseTypes = func() map[string]string {
	m := map[string]string{
		"Plank":       models.ExerciseTime,
		"Crunches":    models.ExerciseReps,
		"Leg Raises":  models.ExerciseReps,
		"Pull-Ups":    models.ExerciseReps,
		"Chin-Ups":    models.ExerciseReps,
		"Push-Ups":    models.ExerciseReps,
		"Tricep Dips": models.ExerciseReps,
	}
	for _, name := range cardioExercises {
		m[name] = models.ExerciseDistanceTime
	}
	return m
}()

// cardioSeededFlag marks a trainee whose catalog already has the Cardio category (new catalogs
// include it; older ones get it added once).
const cardioSeededFlag = "cardio_seeded"

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
	// New catalogs already include Cardio; mark it so ensureCardio never adds a second one.
	if _, err := s.traineeRepo.ClaimFlag(traineeID, cardioSeededFlag); err != nil {
		slog.Warn("mark cardio seeded failed", "trainee_id", traineeID, "err", err)
	}

	categories, exercises := buildCatalog(traineeID, defaultCatalog, time.Now())
	if err := s.repository.AddMany(categories); err != nil {
		if relErr := s.traineeRepo.ReleaseCatalogSeed(traineeID); relErr != nil {
			slog.Error("release catalog seed flag failed", "trainee_id", traineeID, "err", relErr)
		}
		return err
	}
	return s.exerciseRepo.AddMany(exercises)
}

// ensureCardio adds the Cardio category once to catalogs created before it existed. A client who
// already made their own "Cardio" category keeps it untouched.
func (s *CategoryService) ensureCardio(traineeID string, existing []models.Category) ([]models.Category, error) {
	claimed, err := s.traineeRepo.ClaimFlag(traineeID, cardioSeededFlag)
	if err != nil || !claimed {
		return existing, err
	}
	for _, c := range existing {
		if strings.EqualFold(c.Name, cardioCategoryName) {
			return existing, nil
		}
	}
	categories, exercises := buildCatalog(traineeID, []catalogSeedCategory{{cardioCategoryName, cardioExercises}}, time.Now())
	if err := s.repository.AddMany(categories); err != nil {
		if relErr := s.traineeRepo.ReleaseFlag(traineeID, cardioSeededFlag); relErr != nil {
			slog.Error("release cardio seed flag failed", "trainee_id", traineeID, "err", relErr)
		}
		return existing, err
	}
	if err := s.exerciseRepo.AddMany(exercises); err != nil {
		return existing, err
	}
	return append(existing, categories...), nil
}

// buildCatalog turns seed data into category and exercise documents.
func buildCatalog(traineeID string, data []catalogSeedCategory, now time.Time) ([]models.Category, []models.Exercise) {
	categories := make([]models.Category, 0, len(data))
	var exercises []models.Exercise
	for _, d := range data {
		category := models.Category{
			ID:        primitive.NewObjectID(),
			Name:      d.Name,
			TraineeID: traineeID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		categories = append(categories, category)
		for _, name := range d.Exercises {
			exercises = append(exercises, models.Exercise{
				ID:         primitive.NewObjectID(),
				Name:       name,
				Category:   d.Name,
				CategoryID: category.ID,
				Type:       models.NormalizeExerciseType(exerciseTypes[name]),
				CreatedAt:  now,
				UpdatedAt:  now,
			})
		}
	}
	return categories, exercises
}

// sortCategories orders categories by name (case-insensitive), so a back-filled Cardio category
// sits in its alphabetical place like the rest.
func sortCategories(categories []models.Category) {
	sort.SliceStable(categories, func(i, j int) bool {
		return strings.ToLower(categories[i].Name) < strings.ToLower(categories[j].Name)
	})
}
