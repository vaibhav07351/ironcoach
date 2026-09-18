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

type UserRepository struct {
	collection *mongo.Collection
}

func NewUserRepository() *UserRepository {
	db := database.DB.Database("ironcoach")
	return &UserRepository{collection: db.Collection("users")}
}

func (r *UserRepository) Create(user models.User) (models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if user.ID == "" {
		user.ID = primitive.NewObjectID().Hex()
	}
	_, err := r.collection.InsertOne(ctx, user)
	return user, err
}

func (r *UserRepository) FindByGoogleSub(sub string) (models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"google_sub": sub}).Decode(&user)
	return user, err
}

func (r *UserRepository) FindByEmail(email string) (models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	return user, err
}

func (r *UserRepository) FindByID(id string) (models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	return user, err
}

func (r *UserRepository) Update(id string, update map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update["updated_at"] = time.Now()
	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

func (r *UserRepository) UpsertByGoogleSub(user models.User) (models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	filter := bson.M{"google_sub": user.GoogleSub}
	setOnInsert := bson.M{
		"_id":        primitive.NewObjectID().Hex(),
		"created_at": now,
		"role":       user.Role,
	}
	set := bson.M{
		"email":      user.Email,
		"name":       user.Name,
		"picture":    user.Picture,
		"google_sub": user.GoogleSub,
		"updated_at": now,
	}

	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var result models.User
	err := r.collection.FindOneAndUpdate(ctx, filter,
		bson.M{"$set": set, "$setOnInsert": setOnInsert},
		opts,
	).Decode(&result)
	return result, err
}
