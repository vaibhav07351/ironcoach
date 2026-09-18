package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type InviteRepository struct {
	collection *mongo.Collection
}

func NewInviteRepository() *InviteRepository {
	db := database.DB.Database("ironcoach")
	return &InviteRepository{collection: db.Collection("invites")}
}

func (r *InviteRepository) Create(invite models.Invite) (models.Invite, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if invite.ID == "" {
		invite.ID = primitive.NewObjectID().Hex()
	}
	_, err := r.collection.InsertOne(ctx, invite)
	return invite, err
}

func (r *InviteRepository) FindActiveByCode(code string) (models.Invite, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var invite models.Invite
	err := r.collection.FindOne(ctx, bson.M{
		"code":    code,
		"used_at": bson.M{"$exists": false},
		"expires_at": bson.M{"$gt": time.Now()},
	}).Decode(&invite)
	return invite, err
}

func (r *InviteRepository) MarkUsed(id string, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": id, "used_at": bson.M{"$exists": false}},
		bson.M{"$set": bson.M{"used_at": now, "used_by": userID}},
	)
	return err
}

func (r *InviteRepository) InvalidateOpenForTrainee(traineeID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	_, err := r.collection.UpdateMany(ctx,
		bson.M{"trainee_id": traineeID, "used_at": bson.M{"$exists": false}},
		bson.M{"$set": bson.M{"expires_at": now}},
	)
	return err
}
