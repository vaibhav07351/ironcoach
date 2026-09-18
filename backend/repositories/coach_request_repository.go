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

type CoachRequestRepository struct {
	collection *mongo.Collection
}

func NewCoachRequestRepository() *CoachRequestRepository {
	db := database.DB.Database("ironcoach")
	return &CoachRequestRepository{collection: db.Collection("coach_requests")}
}

func (r *CoachRequestRepository) Create(req models.CoachRequest) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if req.ID == "" {
		req.ID = primitive.NewObjectID().Hex()
	}
	req.CreatedAt = time.Now()
	req.Status = models.CoachRequestPending
	_, err := r.collection.InsertOne(ctx, req)
	return req, err
}

func (r *CoachRequestRepository) FindPendingByClientAndTrainer(clientUserID, trainerEmail string) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CoachRequest
	err := r.collection.FindOne(ctx, bson.M{
		"client_user_id": clientUserID,
		"trainer_email":  trainerEmail,
		"status":         models.CoachRequestPending,
	}).Decode(&req)
	return req, err
}

func (r *CoachRequestRepository) ListPendingForTrainer(trainerEmail string) ([]models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(100)
	cursor, err := r.collection.Find(ctx, bson.M{
		"trainer_email": trainerEmail,
		"status":        models.CoachRequestPending,
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []models.CoachRequest
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []models.CoachRequest{}
	}
	return items, nil
}

func (r *CoachRequestRepository) FindByID(id string) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CoachRequest
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&req)
	return req, err
}

func (r *CoachRequestRepository) UpdateStatus(id, status string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{"status": status, "resolved_at": now},
	})
	return err
}

func (r *CoachRequestRepository) CountPendingForTrainer(trainerEmail string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return r.collection.CountDocuments(ctx, bson.M{
		"trainer_email": trainerEmail,
		"status":        models.CoachRequestPending,
	})
}
