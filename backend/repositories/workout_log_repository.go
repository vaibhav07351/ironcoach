package repositories

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	// "go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type WorkoutLogRepository struct {
	collection *mongo.Collection
}

// Constructor for WorkoutLogRepository
func NewWorkoutLogRepository() *WorkoutLogRepository {
	db := database.DB.Database("ironcoach")
	return &WorkoutLogRepository{
		collection: db.Collection("workout_logs"),
	}
}

// Add a new workout log
func (r *WorkoutLogRepository) CreateWorkoutLog(log models.WorkoutLog) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, log)
	return err
}

// Get all workout logs for a trainee
func (r *WorkoutLogRepository) GetWorkoutLogsByTrainee(traineeID string) ([]models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var logs []models.WorkoutLog
	cursor, err := r.collection.Find(ctx, bson.M{"trainee_id": traineeID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var log models.WorkoutLog
		if err := cursor.Decode(&log); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}

func (r *WorkoutLogRepository) UpdateWorkoutLog(id string, update map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 55*time.Second)
	defer cancel()

	// Update the workout log
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"trainee_id": id}, // Match by ID
		bson.M{"$set": update},   // Apply the update
	)
	if err != nil {
		return err
	}

	if result.ModifiedCount == 0 {
		return errors.New("no log updated, log not found or no changes applied")
	}

	return nil
}

func (r *WorkoutLogRepository) DeleteWorkoutLog(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Delete the workout log
	result, err := r.collection.DeleteOne(ctx, bson.M{"trainee_id": id})
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return errors.New("no log found with the provided ID")
	}

	return nil
}
