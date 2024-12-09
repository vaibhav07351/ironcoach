package repositories

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/models"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type TraineeRepository struct {
	collection *mongo.Collection
}

// Constructor for TraineeRepository
func NewTraineeRepository() *TraineeRepository {
	db := database.DB.Database("ironcoach")
	return &TraineeRepository{
		collection: db.Collection("trainees"),
	}
}

// Add a new trainee
func (r *TraineeRepository) CreateTrainee(trainee models.Trainee) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, trainee)
	return err
}

func (r *TraineeRepository) GetTraineesByTrainer(trainerID string, status string) ([]models.Trainee, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()

    var trainees []models.Trainee

    // Build the query based on the inputs
    query := bson.M{"trainer_id": trainerID}

    // Convert `status` string to boolean if it's not empty
    if status != "" {
        activeStatus, err := strconv.ParseBool(status)
        if err != nil {
            return nil, err // Handle invalid status values gracefully
        }
        query["active_status"] = activeStatus
    }

    // Perform the query
    cursor, err := r.collection.Find(ctx, query)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    // Decode the results
    for cursor.Next(ctx) {
        var trainee models.Trainee
        if err := cursor.Decode(&trainee); err != nil {
            return nil, err
        }
        trainees = append(trainees, trainee)
    }

    return trainees, nil
}



// Update a trainee
func (r *TraineeRepository) UpdateTrainee(id string, update map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Convert the id to MongoDB's ObjectID type
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid trainee ID format")
	}

	// Apply the update
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": objectID}, // Match by ID
		bson.M{"$set": update},  // Apply updates
	)
	if err != nil {
		return err
	}

	// Check if the document was actually updated
	if result.ModifiedCount == 0 {
		return errors.New("no document updated, trainee not found or no changes applied")
	}

	return nil
}

// Delete a trainee
func (r *TraineeRepository) DeleteTrainee(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Convert the id to MongoDB's ObjectID type
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid trainee ID format")
	}
	
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}
