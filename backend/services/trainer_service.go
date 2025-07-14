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
	repository   *repositories.TrainerRepository
	categoryRepo *repositories.CategoryRepository
	exerciseRepo *repositories.ExerciseRepository
}

// constructor for TrainerService
func NewTrainerService() *TrainerService {
	return &TrainerService{
		repository:   repositories.NewTrainerRepository(),
		categoryRepo: repositories.NewCategoryRepository(),
		exerciseRepo: repositories.NewExerciseRepository(),
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
	// Save trainer
	if err := s.repository.CreateTrainer(trainer); err != nil {
		return err
	}

	// Add default categories and exercises
	defaultCategories := []string{
		"Abs", "Back", "Biceps", "Chest", "Forearms", "Legs", "Shoulders", "Triceps",
	}

	defaultExercises := map[string][]string{
		"Abs":       {"Crunches", "Plank", "Leg Raises"},
		"Back":      {"Pull-Ups", "Deadlift"},
		"Biceps":    {"Barbell Curl", "Hammer Curl"},
		"Chest":     {"Bench Press", "Push-Ups"},
		"Forearms":  {"Wrist Curls"},
		"Legs":      {"Squats", "Lunges"},
		"Shoulders": {"Shoulder Press", "Lateral Raise"},
		"Triceps":   {"Tricep Dips", "Overhead Extension"},
	}

	for _, cat := range defaultCategories {
		category := models.Category{
			ID:        primitive.NewObjectID(),
			Name:      cat,
			TrainerID: trainer.Email, // You can switch to ObjectID if stored
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := s.categoryRepo.AddCategory(category); err != nil {
			continue // skip but do not break registration
		}

		for _, ex := range defaultExercises[cat] {
			exercise := models.Exercise{
				Name:       ex,
				Category:   cat,
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
