package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type RatingRepository struct {
	collection *mongo.Collection
}

func NewRatingRepository() *RatingRepository {
	db := database.DB.Database("ironcoach")
	coll := db.Collection("ratings")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, _ = coll.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{
			{Key: "from_user_id", Value: 1},
			{Key: "to_kind", Value: 1},
			{Key: "to_id", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	})
	return &RatingRepository{collection: coll}
}

func (r *RatingRepository) Upsert(rating models.Rating) (models.Rating, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	now := time.Now()
	filter := bson.M{
		"from_user_id": rating.FromUserID,
		"to_kind":      rating.ToKind,
		"to_id":        rating.ToID,
	}

	var existing models.Rating
	err := r.collection.FindOne(ctx, filter).Decode(&existing)
	if err == nil && existing.ID != "" {
		_, err = r.collection.UpdateOne(ctx, bson.M{"_id": existing.ID}, bson.M{
			"$set": bson.M{
				"score":      rating.Score,
				"from_role":  rating.FromRole,
				"updated_at": now,
			},
		})
		if err != nil {
			return models.Rating{}, err
		}
		existing.Score = rating.Score
		existing.FromRole = rating.FromRole
		existing.UpdatedAt = now
		return existing, nil
	}
	if err != nil && err != mongo.ErrNoDocuments {
		return models.Rating{}, err
	}

	if rating.ID == "" {
		rating.ID = primitive.NewObjectID().Hex()
	}
	rating.CreatedAt = now
	rating.UpdatedAt = now
	_, err = r.collection.InsertOne(ctx, rating)
	return rating, err
}

func (r *RatingRepository) FindMine(fromUserID, toKind, toID string) (models.Rating, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var rating models.Rating
	err := r.collection.FindOne(ctx, bson.M{
		"from_user_id": fromUserID,
		"to_kind":      toKind,
		"to_id":        toID,
	}).Decode(&rating)
	return rating, err
}

func (r *RatingRepository) AverageForTarget(toKind, toID string) (avg float64, count int, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"to_kind": toKind, "to_id": toID}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"avg":   bson.M{"$avg": "$score"},
			"count": bson.M{"$sum": 1},
		}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var rows []struct {
		Avg   float64 `bson:"avg"`
		Count int     `bson:"count"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return 0, 0, err
	}
	if len(rows) == 0 {
		return 0, 0, nil
	}
	return rows[0].Avg, rows[0].Count, nil
}
