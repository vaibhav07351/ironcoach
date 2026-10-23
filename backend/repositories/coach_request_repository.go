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
	db := database.Database()
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

func (r *CoachRequestRepository) FindPendingByClientAndTrainer(clientUserID, trainerID string) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CoachRequest
	err := r.collection.FindOne(ctx, bson.M{
		"client_user_id": clientUserID,
		"trainer_id":     trainerID,
		"status":         models.CoachRequestPending,
	}).Decode(&req)
	return req, err
}

func (r *CoachRequestRepository) ListPendingForTrainer(trainerID string) ([]models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(100)
	cursor, err := r.collection.Find(ctx, bson.M{
		"trainer_id": trainerID,
		"status":     models.CoachRequestPending,
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

func (r *CoachRequestRepository) CountPendingForTrainer(trainerID string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return r.collection.CountDocuments(ctx, bson.M{
		"trainer_id": trainerID,
		"status":     models.CoachRequestPending,
	})
}

// Resolve atomically moves a pending request owned by trainerKey to status and returns it.
// Returns mongo.ErrNoDocuments if it is missing, not pending, or owned by someone else, so a
// double tap or a race can resolve it only once.
func (r *CoachRequestRepository) Resolve(id, trainerKey, status string) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CoachRequest
	err := r.collection.FindOneAndUpdate(ctx,
		bson.M{"_id": id, "trainer_id": trainerKey, "status": models.CoachRequestPending},
		bson.M{"$set": bson.M{"status": status, "resolved_at": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&req)
	return req, err
}

// Reopen moves a request back to pending (used when an accept could not complete).
func (r *CoachRequestRepository) Reopen(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": id},
		bson.M{"$set": bson.M{"status": models.CoachRequestPending}, "$unset": bson.M{"resolved_at": ""}},
	)
	return err
}

// CloseOtherPendingForClient cancels a client's remaining pending requests once they are
// linked to a coach.
func (r *CoachRequestRepository) CloseOtherPendingForClient(clientUserID, keepID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.UpdateMany(ctx,
		bson.M{"client_user_id": clientUserID, "status": models.CoachRequestPending, "_id": bson.M{"$ne": keepID}},
		bson.M{"$set": bson.M{"status": models.CoachRequestCancelled, "resolved_at": time.Now()}},
	)
	return err
}

// CountPendingForClient counts a client's open requests.
func (r *CoachRequestRepository) CountPendingForClient(clientUserID string) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return r.collection.CountDocuments(ctx, bson.M{"client_user_id": clientUserID, "status": models.CoachRequestPending})
}

// LatestForClientAndTrainer returns the most recent request between a client and a trainer.
func (r *CoachRequestRepository) LatestForClientAndTrainer(clientUserID, trainerKey string) (models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var req models.CoachRequest
	err := r.collection.FindOne(ctx,
		bson.M{"client_user_id": clientUserID, "trainer_id": trainerKey},
		options.FindOne().SetSort(bson.D{{Key: "created_at", Value: -1}}),
	).Decode(&req)
	return req, err
}

// ListForClient lists a client's own requests, newest first.
func (r *CoachRequestRepository) ListForClient(clientUserID string, limit int) ([]models.CoachRequest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx,
		bson.M{"client_user_id": clientUserID},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(int64(limit)),
	)
	if err != nil {
		return nil, err
	}
	items := []models.CoachRequest{}
	if err := cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	return items, nil
}

// CancelForClient cancels one of the client's own pending requests.
func (r *CoachRequestRepository) CancelForClient(id, clientUserID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": id, "client_user_id": clientUserID, "status": models.CoachRequestPending},
		bson.M{"$set": bson.M{"status": models.CoachRequestCancelled, "resolved_at": time.Now()}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

// DeleteForClient removes all requests made by a client (account deletion).
func (r *CoachRequestRepository) DeleteForClient(clientUserID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := r.collection.DeleteMany(ctx, bson.M{"client_user_id": clientUserID})
	return err
}

// DeleteForTrainer removes all requests sent to a trainer (account deletion).
func (r *CoachRequestRepository) DeleteForTrainer(trainerKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := r.collection.DeleteMany(ctx, bson.M{"trainer_id": trainerKey})
	return err
}
