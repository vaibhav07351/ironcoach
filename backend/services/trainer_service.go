package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/utils"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TrainerService struct {
	repository     *repositories.TrainerRepository
	categoryRepo   *repositories.CategoryRepository
	exerciseRepo   *repositories.ExerciseRepository
	traineeRepo    *repositories.TraineeRepository
	workoutLogRepo *repositories.WorkoutLogRepository
	dietEntryRepo  *repositories.DietEntryRepository
	progressRepo   *repositories.ProgressRepository
}

// constructor for TrainerService
func NewTrainerService() *TrainerService {
	return &TrainerService{
		repository:     repositories.NewTrainerRepository(),
		categoryRepo:   repositories.NewCategoryRepository(),
		exerciseRepo:   repositories.NewExerciseRepository(),
		traineeRepo:    repositories.NewTraineeRepository(),
		workoutLogRepo: repositories.NewWorkoutLogRepository(),
		dietEntryRepo:  repositories.NewDietEntryRepository(),
		progressRepo:   repositories.NewProgressRepository(),
	}
}

// Register a new Trainer
func (s *TrainerService) RegisterTrainer(trainer models.Trainer) error {

	existingTrainer, _ := s.repository.FindByEmail(trainer.Email)
	if existingTrainer.Email != "" {
		return errors.New("trainer with this email already exists")
	}

	//Hash the password
	hashedPassword, err := utils.HashPassword(trainer.Password)
	if err != nil {
		return err
	}

	trainer.Password = hashedPassword
	trainer.CreatedAt = time.Now()

	//save trainer to database
	if err := s.repository.CreateTrainer(trainer); err != nil {
		return err
	}

	// Define default categories with exactly 4 exercises each
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
	
	// Create categories and exercises in one loop
	for _, data := range defaultData {
		// Create category
		category := models.Category{
			ID:        primitive.NewObjectID(),
			Name:      data.CategoryName,
			TrainerID: trainer.Email,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := s.categoryRepo.AddCategory(category); err != nil {
			continue // skip this category if creation fails
		}

		// Create all exercises for this category
		for _, exerciseName := range data.Exercises {
			exercise := models.Exercise{
				ID:         primitive.NewObjectID(),
				Name:       exerciseName,
				Category:   data.CategoryName,
				CategoryID: category.ID,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}
			_ = s.exerciseRepo.AddExercise(exercise)
		}
	}

	return nil
}

func (s *TrainerService) LoginTrainer(email, password string) (token string, err error) {

	//Find Trainer by email
	trainer, err := s.repository.FindByEmail(email)
	if err != nil || trainer.Email == "" {
		err = errors.New("invalid email or password")
		return
	}

	//verify password
	if !utils.CheckPassword(trainer.Password, password) {
		err = errors.New("invalid email or password")
		return
	}

	//Generate JWT token
	token, err = utils.GenerateJWT(trainer.Email)
	if err != nil {
		err = errors.New("failed to generate token")
		return
	}

	return
}

func (s *TrainerService) GetTrainers() ([]models.Trainer, error) {
	return s.repository.GetTrainers()
}

func (s *TrainerService) GetTrainerByID(id string) (models.Trainer, error) {
	return s.repository.GetTrainerByID(id)
}

// DeleteTrainerCascade performs cascading delete of trainer and all associated data
func (s *TrainerService) DeleteTrainerCascade(trainerEmail string) error {
	// Step 1: Get all trainee IDs for this trainer
	traineeIDs, err := s.traineeRepo.GetTraineeIDsByTrainer(trainerEmail)
	if err != nil {
		return err
	}

	// Step 3: Delete all trainee-related data first
	if len(traineeIDs) > 0 {
		// Delete workout logs
		if err := s.workoutLogRepo.DeleteWorkoutLogsByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete diet entries
		if err := s.dietEntryRepo.DeleteDietEntriesByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete progress entries
		if err := s.progressRepo.DeleteProgressByTrainees(traineeIDs); err != nil {
			return err
		}

		// Delete trainees
		if err := s.traineeRepo.DeleteTraineesByTrainer(trainerEmail); err != nil {
			return err
		}
	}

	// Step 4: Delete exercises for each category (this will also delete related workout logs)
	categories, err := s.categoryRepo.GetCategories(trainerEmail)
	if err != nil {
		return err
	}
	for _, category := range categories {
		if err := s.exerciseRepo.DeleteExercisesByCategoryID(category.ID.Hex()); err != nil {
			return err
		}
	}

	// Step 5: Delete categories
	if err := s.categoryRepo.DeleteCategoriesByTrainer(trainerEmail); err != nil {
		return err
	}

	// Step 6: Finally, delete the trainer
	if err := s.repository.DeleteTrainer(trainerEmail); err != nil {
		return err
	}

	return nil
}
