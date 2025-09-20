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
	if err := s.repository.CreateTrainer(trainer); err != nil {
		return err
	}

	// Define default categories with their exercises
	defaultData := []struct {
		CategoryName string
		Exercises    []string
	}{
		{"Abs", []string{"Crunches", "Plank", "Leg Raises", "Russian Twists", "Mountain Climbers", "Bicycle Crunches", "Dead Bug", "Hanging Knee Raises"}},
		{"Back", []string{"Pull-Ups", "Deadlift", "Bent Over Rows", "Lat Pulldowns", "T-Bar Rows", "Cable Rows", "Face Pulls", "Reverse Flyes"}},
		{"Biceps", []string{"Barbell Curl", "Hammer Curl", "Dumbbell Curls", "Cable Curls", "Chin-Ups", "Preacher Curls", "21s", "Concentration Curls"}},
		{"Chest", []string{"Bench Press", "Push-Ups", "Incline Bench Press", "Decline Bench Press", "Dumbbell Flyes", "Dips", "Cable Crossovers", "Incline Dumbbell Press"}},
		{"Forearms", []string{"Wrist Curls", "Reverse Wrist Curls", "Farmer's Walk", "Plate Pinches", "Hammer Curls", "Reverse Curls", "Grip Squeeze", "Wrist Rollers"}},
		{"Legs", []string{"Squats", "Lunges", "Deadlifts", "Leg Press", "Bulgarian Split Squats", "Calf Raises", "Romanian Deadlifts", "Walking Lunges", "Goblet Squats", "Hip Thrusts"}},
		{"Shoulders", []string{"Shoulder Press", "Lateral Raise", "Front Raise", "Rear Delt Flyes", "Arnold Press", "Upright Rows", "Pike Push-Ups", "Handstand Push-Ups"}},
		{"Triceps", []string{"Tricep Dips", "Overhead Extension", "Close-Grip Bench Press", "Tricep Pushdowns", "Diamond Push-Ups", "Skull Crushers", "Kickbacks", "Overhead Cable Extension"}},
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
