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
	db := database.Database()
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
	if user.OnboardingDone != nil {
		setOnInsert["onboarding_done"] = *user.OnboardingDone
	}
	if user.Timezone != "" {
		setOnInsert["timezone"] = user.Timezone
	}
	if user.TermsAcceptedAt != nil {
		setOnInsert["terms_accepted_at"] = *user.TermsAcceptedAt
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

// unlinkedUserFilter matches client accounts not linked to any trainee.
var unlinkedUserFilter = bson.A{
	bson.M{"trainee_id": bson.M{"$exists": false}},
	bson.M{"trainee_id": ""},
	bson.M{"trainee_id": nil},
}

// LinkTrainee links an unlinked client account to a trainee in one conditional write.
// Returns false if the user does not exist or is already linked.
func (r *UserRepository) LinkTrainee(userID, traineeID, trainerKey string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": userID, "role": models.RoleClient, "$or": unlinkedUserFilter},
		bson.M{"$set": bson.M{"trainee_id": traineeID, "trainer_id": trainerKey, "updated_at": time.Now()}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

// UnlinkTrainee clears a client's coach link.
func (r *UserRepository) UnlinkTrainee(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{"$unset": bson.M{"trainee_id": "", "trainer_id": ""}, "$set": bson.M{"updated_at": time.Now()}},
	)
	return err
}

// UnlinkByTrainees clears the coach link of every client linked to one of the trainees.
func (r *UserRepository) UnlinkByTrainees(traineeIDs []string) error {
	if len(traineeIDs) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.UpdateMany(ctx,
		bson.M{"trainee_id": bson.M{"$in": traineeIDs}},
		bson.M{"$unset": bson.M{"trainee_id": "", "trainer_id": ""}, "$set": bson.M{"updated_at": time.Now()}},
	)
	return err
}

// Delete removes a user account document.
func (r *UserRepository) Delete(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": userID})
	return err
}
