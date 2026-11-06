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

// BodyMeasurementRepository stores body measurements, one value per trainee, metric and day.
type BodyMeasurementRepository struct {
	collection *mongo.Collection
}

func NewBodyMeasurementRepository() *BodyMeasurementRepository {
	return &BodyMeasurementRepository{collection: database.Database().Collection("body_measurements")}
}

// Upsert stores the day's value of a metric; recording again the same day replaces it.
func (r *BodyMeasurementRepository) Upsert(traineeID, metric, date string, value float64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now().UTC()
	_, err := r.collection.UpdateOne(ctx,
		bson.M{"trainee_id": traineeID, "metric": metric, "date": date},
		bson.M{"$set": bson.M{"value": value, "updated_at": now}, "$setOnInsert": bson.M{"created_at": now}},
		options.Update().SetUpsert(true),
	)
	return err
}

// Delete removes the day's value of a metric. found=false means there was none.
func (r *BodyMeasurementRepository) Delete(traineeID, metric, date string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := r.collection.DeleteOne(ctx, bson.M{"trainee_id": traineeID, "metric": metric, "date": date})
	if err != nil {
		return false, err
	}
	return res.DeletedCount > 0, nil
}

// Series returns one metric's values on or after from (empty = all), oldest first, capped to the
// most recent `limit`.
func (r *BodyMeasurementRepository) Series(traineeID, metric, from string, limit int) ([]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": traineeID, "metric": metric}
	if from != "" {
		filter["date"] = bson.M{"$gte": from}
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetProjection(bson.M{"date": 1, "value": 1}).
		SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	out := []models.DatedValue{}
	if err := cursor.All(ctx, &out); err != nil {
		return nil, err
	}
	reverseDated(out)
	return out, nil
}

// datedValueRow decodes {date, value} sub-documents built by aggregation pipelines.
type datedValueRow struct {
	Date  string  `bson:"date"`
	Value float64 `bson:"value"`
}

func (d datedValueRow) toModel() models.DatedValue {
	return models.DatedValue{Date: d.Date, Value: d.Value}
}

// LatestTwo returns, per metric, the two most recent values (newest first) in one query.
func (r *BodyMeasurementRepository) LatestTwo(traineeID string) (map[string][]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": traineeID}}},
		{{Key: "$sort", Value: bson.D{{Key: "metric", Value: 1}, {Key: "date", Value: -1}}}},
		{{Key: "$group", Value: bson.M{
			"_id":    "$metric",
			"values": bson.M{"$push": bson.M{"date": "$date", "value": "$value"}},
		}}},
		{{Key: "$project", Value: bson.M{"values": bson.M{"$slice": bson.A{"$values", 2}}}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID     string          `bson:"_id"`
		Values []datedValueRow `bson:"values"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[string][]models.DatedValue, len(rows))
	for _, row := range rows {
		vals := make([]models.DatedValue, len(row.Values))
		for i, v := range row.Values {
			vals[i] = v.toModel()
		}
		out[row.ID] = vals
	}
	return out, nil
}

// FirstAndLatest returns, per metric, the earliest and the latest value in one query.
func (r *BodyMeasurementRepository) FirstAndLatest(traineeID string) (map[string][2]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": traineeID}}},
		{{Key: "$sort", Value: bson.D{{Key: "metric", Value: 1}, {Key: "date", Value: 1}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$metric",
			"first": bson.M{"$first": bson.M{"date": "$date", "value": "$value"}},
			"last":  bson.M{"$last": bson.M{"date": "$date", "value": "$value"}},
		}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID    string        `bson:"_id"`
		First datedValueRow `bson:"first"`
		Last  datedValueRow `bson:"last"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[string][2]models.DatedValue, len(rows))
	for _, row := range rows {
		out[row.ID] = [2]models.DatedValue{row.First.toModel(), row.Last.toModel()}
	}
	return out, nil
}

// ValuesOnOrBefore returns, per metric, the latest value on or before date.
func (r *BodyMeasurementRepository) ValuesOnOrBefore(traineeID, date string) (map[string]models.DatedValue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": traineeID, "date": bson.M{"$lte": date}}}},
		{{Key: "$sort", Value: bson.D{{Key: "metric", Value: 1}, {Key: "date", Value: -1}}}},
		{{Key: "$group", Value: bson.M{"_id": "$metric", "v": bson.M{"$first": bson.M{"date": "$date", "value": "$value"}}}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID string        `bson:"_id"`
		V  datedValueRow `bson:"v"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make(map[string]models.DatedValue, len(rows))
	for _, row := range rows {
		out[row.ID] = row.V.toModel()
	}
	return out, nil
}

// DeleteByTrainees removes all measurements of the given trainees.
func (r *BodyMeasurementRepository) DeleteByTrainees(traineeIDs []string) error {
	if len(traineeIDs) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}

func reverseDated(v []models.DatedValue) {
	for i, j := 0, len(v)-1; i < j; i, j = i+1, j-1 {
		v[i], v[j] = v[j], v[i]
	}
}
