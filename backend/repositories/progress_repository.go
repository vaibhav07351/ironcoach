package repositories

import (
	"context"
	"errors"
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

// weightRow decodes a weigh-in's date and weight.
type weightRow struct {
	Date   string  `bson:"date"`
	Weight float64 `bson:"weight"`
}

// WeightSeries returns weigh-ins on or after from (empty = all), oldest first, capped to the most
// recent `limit`.
func (r *ProgressRepository) WeightSeries(traineeID, from string, limit int) ([]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": traineeID}
	if from != "" {
		filter["date"] = bson.M{"$gte": from}
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetProjection(bson.M{"date": 1, "weight": 1}).
		SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	var rows []weightRow
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make([]models.DatedValue, len(rows))
	for i, row := range rows {
		out[len(rows)-1-i] = models.DatedValue{Date: row.Date, Value: row.Weight}
	}
	return out, nil
}

// findWeight returns the first weigh-in matching filter in the given date order, or nil.
func (r *ProgressRepository) findWeight(filter bson.M, dateOrder int) (*models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var row weightRow
	err := r.collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "date", Value: dateOrder}})).Decode(&row)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &models.DatedValue{Date: row.Date, Value: row.Weight}, nil
}

// WeightOnOrBefore is the latest weigh-in on or before date, or nil.
func (r *ProgressRepository) WeightOnOrBefore(traineeID, date string) (*models.DatedValue, error) {
	return r.findWeight(bson.M{"trainee_id": traineeID, "date": bson.M{"$lte": date}}, -1)
}

// FirstWeight is the earliest weigh-in, or nil.
func (r *ProgressRepository) FirstWeight(traineeID string) (*models.DatedValue, error) {
	return r.findWeight(bson.M{"trainee_id": traineeID}, 1)
}

// LatestTwoWeights returns the two most recent weigh-ins, newest first.
func (r *ProgressRepository) LatestTwoWeights(traineeID string) ([]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "date", Value: -1}}).SetProjection(bson.M{"date": 1, "weight": 1}).SetLimit(2)
	cursor, err := r.collection.Find(ctx, bson.M{"trainee_id": traineeID}, opts)
	if err != nil {
		return nil, err
	}
	var rows []weightRow
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make([]models.DatedValue, len(rows))
	for i, row := range rows {
		out[i] = models.DatedValue{Date: row.Date, Value: row.Weight}
	}
	return out, nil
}
