package services

import (
	"errors"
	"ironcoach/models"
	"ironcoach/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// loadTraineeExercise fetches an exercise and checks it belongs to the trainee's catalog (its
// category is owned by the trainee). The returned exercise has a normalized type. Unknown,
// malformed and other clients' ids all read as "not found", so foreign ids are never confirmed.
func loadTraineeExercise(exercises *repositories.ExerciseRepository, categories *repositories.CategoryRepository, traineeID, exerciseID string) (models.Exercise, error) {
	if !primitive.IsValidObjectID(exerciseID) {
		return models.Exercise{}, ErrNotFound("exercise")
	}
	exercise, err := exercises.GetExerciseByID(exerciseID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Exercise{}, ErrNotFound("exercise")
		}
		return models.Exercise{}, err
	}
	category, err := categories.GetCategoryByID(exercise.CategoryID.Hex())
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Exercise{}, ErrNotFound("exercise")
		}
		return models.Exercise{}, err
	}
	if category.TraineeID != traineeID {
		return models.Exercise{}, ErrNotFound("exercise")
	}
	exercise.Type = models.NormalizeExerciseType(exercise.Type)
	return exercise, nil
}
