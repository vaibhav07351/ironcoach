package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type ProgressRepository struct {
	collection *mongo.Collection
}

func NewProgressRepository() *ProgressRepository {
	db := database.DB.Database("ironcoach")
	return &ProgressRepository{
		collection: db.Collection("progress"),
	}
}

func (r *ProgressRepository) GetWeightBMIProgress(traineeID string) ([]models.WeightBMIProgress, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": traineeID}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var progress []models.WeightBMIProgress
	for cursor.Next(ctx) {
		var entry models.WeightBMIProgress
		if err := cursor.Decode(&entry); err != nil {
			return nil, err
		}
		progress = append(progress, entry)
	}

	return progress, nil
}

func (r *ProgressRepository) AddWeightProgress(progress models.WeightBMIProgress) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, progress)
	return err
}

// Delete all progress entries by trainee IDs
func (r *ProgressRepository) DeleteProgressByTrainees(traineeIDs []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if len(traineeIDs) == 0 {
		return nil // No trainees to delete progress for
	}

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}
