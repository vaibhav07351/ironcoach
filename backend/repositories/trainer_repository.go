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

// maxDiscoveryCandidates bounds how many trainer profiles discovery ranks per request.
const maxDiscoveryCandidates = 2000

type TrainerRepository struct {
	collection *mongo.Collection
}

// constructor for TrainerRepository
func NewTrainerRepository() *TrainerRepository {
	db := database.Database()
	return &TrainerRepository{
		collection: db.Collection("trainers"),
	}
}

// CreateTrainer inserts a trainer profile. The unique email and user_id indexes reject
// duplicates (mongo duplicate key error).
func (r *TrainerRepository) CreateTrainer(trainer models.Trainer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, trainer)
	return err
}

// FindByUserID finds the profile of the trainer with the given user id.
func (r *TrainerRepository) FindByUserID(userID string) (models.Trainer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var trainer models.Trainer
	if userID == "" {
		return trainer, mongo.ErrNoDocuments
	}
	err := r.collection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&trainer)
	return trainer, err
}

// UpdateByUserID patches profile fields. found=false means the trainer has no profile.
func (r *TrainerRepository) UpdateByUserID(userID string, set bson.M) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	set["updated_at"] = time.Now()
	res, err := r.collection.UpdateOne(ctx, bson.M{"user_id": userID}, bson.M{"$set": set})
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}

// DeleteByUserID removes a trainer profile.
func (r *TrainerRepository) DeleteByUserID(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"user_id": userID})
	return err
}

// FindDiscoveryVisible returns owned profiles opted into discovery that have a location.
// Contact details are projected out: they are never needed for discovery.
func (r *TrainerRepository) FindDiscoveryVisible() ([]models.Trainer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"discovery_visible": true,
		"user_id":           bson.M{"$gt": ""},
		"$or": []bson.M{
			{"latitude": bson.M{"$exists": true, "$ne": 0}},
			{"longitude": bson.M{"$exists": true, "$ne": 0}},
			{"city": bson.M{"$exists": true, "$nin": []interface{}{"", nil}}},
			{"pincode": bson.M{"$exists": true, "$nin": []interface{}{"", nil}}},
		},
	}
	opts := options.Find().
		SetLimit(maxDiscoveryCandidates).
		SetProjection(bson.M{"phone_number": 0, "address": 0, "date_of_birth": 0, "email": 0})
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	trainers := []models.Trainer{}
	if err := cursor.All(ctx, &trainers); err != nil {
		return nil, err
	}
	return trainers, nil
}
