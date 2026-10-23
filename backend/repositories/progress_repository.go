package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProgressRepository struct {
	collection *mongo.Collection
}

func NewProgressRepository() *ProgressRepository {
	db := database.Database()
	return &ProgressRepository{
		collection: db.Collection("progress"),
	}
}

// GetWeightBMIProgress returns the most recent `limit` weight entries in date order (oldest first).
func (r *ProgressRepository) GetWeightBMIProgress(traineeID string, limit int) ([]models.WeightBMIProgress, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, bson.M{"trainee_id": traineeID}, opts)
	if err != nil {
		return nil, err
	}
	progress := []models.WeightBMIProgress{}
	if err := cursor.All(ctx, &progress); err != nil {
		return nil, err
	}
	for i, j := 0, len(progress)-1; i < j; i, j = i+1, j-1 {
		progress[i], progress[j] = progress[j], progress[i]
	}
	return progress, nil
}

// UpsertWeightProgress stores one weight entry per trainee per date; logging again on the same
// day replaces that day's value, so retries never create duplicates.
func (r *ProgressRepository) UpsertWeightProgress(p models.WeightBMIProgress) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now().UTC()
	set := bson.M{"weight": p.Weight, "bmi": p.BMI, "updated_at": now}
	if p.BodyFat > 0 {
		set["body_fat"] = p.BodyFat
	}
	_, err := r.collection.UpdateOne(ctx,
		bson.M{"trainee_id": p.TraineeID, "date": p.Date},
		bson.M{"$set": set, "$setOnInsert": bson.M{"created_at": now}},
		options.Update().SetUpsert(true),
	)
	return err
}

// DeleteProgressByTrainees deletes all progress entries of the given trainees.
func (r *ProgressRepository) DeleteProgressByTrainees(traineeIDs []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if len(traineeIDs) == 0 {
		return nil
	}
	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}
