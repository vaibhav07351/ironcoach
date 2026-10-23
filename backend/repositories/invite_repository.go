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

type InviteRepository struct {
	collection *mongo.Collection
}

func NewInviteRepository() *InviteRepository {
	db := database.Database()
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
		"code":       code,
		"used_at":    bson.M{"$exists": false},
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

// ClaimByCode atomically marks an unused, unexpired invite as used by userID and returns it.
// Two concurrent redeems of the same code cannot both succeed.
func (r *InviteRepository) ClaimByCode(code, userID string) (models.Invite, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	var invite models.Invite
	err := r.collection.FindOneAndUpdate(ctx,
		bson.M{"code": code, "used_at": bson.M{"$exists": false}, "expires_at": bson.M{"$gt": now}},
		bson.M{"$set": bson.M{"used_at": now, "used_by": userID}},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&invite)
	return invite, err
}

// Release undoes ClaimByCode when the rest of the redeem could not complete.
func (r *InviteRepository) Release(id, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": id, "used_by": userID},
		bson.M{"$unset": bson.M{"used_at": "", "used_by": ""}},
	)
	return err
}

// DeleteByTrainees removes invites for the given trainees.
func (r *InviteRepository) DeleteByTrainees(traineeIDs []string) error {
	if len(traineeIDs) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}
