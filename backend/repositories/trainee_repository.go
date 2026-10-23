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

type TraineeRepository struct {
	collection *mongo.Collection
}

// Constructor for TraineeRepository
func NewTraineeRepository() *TraineeRepository {
	db := database.Database()
	return &TraineeRepository{
		collection: db.Collection("trainees"),
	}
}

// unlinkedFilter matches trainees not linked to any client account.
var unlinkedFilter = bson.A{
	bson.M{"user_id": bson.M{"$exists": false}},
	bson.M{"user_id": ""},
	bson.M{"user_id": nil},
}

// CreateTrainee inserts a trainee and returns its id (an ObjectID hex string).
func (r *TraineeRepository) CreateTrainee(trainee models.Trainee) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid := primitive.NewObjectID()
	if trainee.ID != "" {
		parsed, err := primitive.ObjectIDFromHex(trainee.ID)
		if err != nil {
			return "", err
		}
		oid = parsed
	}
	trainee.ID = ""
	doc, err := toDocWithID(trainee, oid)
	if err != nil {
		return "", err
	}
	if _, err := r.collection.InsertOne(ctx, doc); err != nil {
		return "", err
	}
	return oid.Hex(), nil
}

// GetTraineesByTrainer lists a trainer's trainees by name. activeStatus nil means all.
func (r *TraineeRepository) GetTraineesByTrainer(trainerID string, activeStatus *bool, limit, offset int) ([]models.Trainee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := bson.M{"trainer_id": trainerID}
	if activeStatus != nil {
		query["active_status"] = *activeStatus
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "name", Value: 1}, {Key: "_id", Value: 1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		// Assessment arrays can be large and are not needed for list views.
		SetProjection(bson.M{"fitness_tests": 0, "lab_tests": 0, "health_questionnaire": 0})

	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	trainees := []models.Trainee{}
	if err := cursor.All(ctx, &trainees); err != nil {
		return nil, err
	}
	return trainees, nil
}

// ListActiveRefs returns id and name of a trainer's active trainees.
func (r *TraineeRepository) ListActiveRefs(trainerID string) ([]models.TraineeRef, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().SetProjection(bson.M{"_id": 1, "name": 1, "phone_number": 1}).SetLimit(1000)
	cursor, err := r.collection.Find(ctx, bson.M{"trainer_id": trainerID, "active_status": true}, opts)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID          primitive.ObjectID `bson:"_id"`
		Name        string             `bson:"name"`
		PhoneNumber string             `bson:"phone_number"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	refs := make([]models.TraineeRef, 0, len(rows))
	for _, row := range rows {
		refs = append(refs, models.TraineeRef{ID: row.ID.Hex(), Name: row.Name, PhoneNumber: row.PhoneNumber})
	}
	return refs, nil
}

// GetTraineeByID returns mongo.ErrNoDocuments for unknown or malformed ids.
func (r *TraineeRepository) GetTraineeByID(id string) (models.Trainee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var trainee models.Trainee
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return trainee, mongo.ErrNoDocuments
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&trainee)
	return trainee, err
}

// UpdateFields applies a $set to one trainee. found=false means no trainee has that id.
// A no-op update (same values) still counts as found.
func (r *TraineeRepository) UpdateFields(id string, set bson.M) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, nil
	}
	set["updated_at"] = time.Now().UTC()
	res, err := r.collection.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set})
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}

// ClaimForUser links an unlinked trainee to a client account in one conditional write.
// Returns false if the trainee does not exist or is already linked (no partial state).
func (r *TraineeRepository) ClaimForUser(traineeID, userID, email string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(traineeID)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": oid, "$or": unlinkedFilter},
		bson.M{"$set": bson.M{"user_id": userID, "email": email, "active_status": true, "updated_at": time.Now().UTC()}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

// ReleaseUser removes a client link, only if the trainee is still linked to that user.
func (r *TraineeRepository) ReleaseUser(traineeID, userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(traineeID)
	if err != nil {
		return nil
	}
	_, err = r.collection.UpdateOne(ctx,
		bson.M{"_id": oid, "user_id": userID},
		bson.M{"$unset": bson.M{"user_id": "", "email": ""}, "$set": bson.M{"updated_at": time.Now().UTC()}},
	)
	return err
}

// ReleaseAllForUser removes a client's link from every trainee pointing at them.
func (r *TraineeRepository) ReleaseAllForUser(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.UpdateMany(ctx,
		bson.M{"user_id": userID},
		bson.M{"$unset": bson.M{"user_id": "", "email": ""}, "$set": bson.M{"updated_at": time.Now().UTC()}},
	)
	return err
}

// DeleteTrainee removes one trainee document.
func (r *TraineeRepository) DeleteTrainee(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

// DeleteTraineesByTrainer removes all trainees of a trainer.
func (r *TraineeRepository) DeleteTraineesByTrainer(trainerID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainer_id": trainerID})
	return err
}

// GetTraineeIDsByTrainer returns all trainee ids of a trainer (for cascading deletes).
func (r *TraineeRepository) GetTraineeIDsByTrainer(trainerID string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx, bson.M{"trainer_id": trainerID}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID primitive.ObjectID `bson:"_id"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID.Hex())
	}
	return ids, nil
}

// ImageURLsByIDs returns the stored image URLs of the given trainees (for media cleanup).
func (r *TraineeRepository) ImageURLsByIDs(ids []string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	oids := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			oids = append(oids, oid)
		}
	}
	if len(oids) == 0 {
		return nil, nil
	}
	cursor, err := r.collection.Find(ctx,
		bson.M{"_id": bson.M{"$in": oids}, "image_url": bson.M{"$gt": ""}},
		options.Find().SetProjection(bson.M{"image_url": 1}),
	)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ImageURL string `bson:"image_url"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	urls := make([]string, 0, len(rows))
	for _, row := range rows {
		urls = append(urls, row.ImageURL)
	}
	return urls, nil
}

// ClaimCatalogSeed marks a trainee's default catalog as seeded. It returns true only for the
// first caller, so the defaults are inserted exactly once even under concurrent requests.
func (r *TraineeRepository) ClaimCatalogSeed(traineeID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(traineeID)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.UpdateOne(ctx,
		bson.M{"_id": oid, "catalog_seeded": bson.M{"$ne": true}},
		bson.M{"$set": bson.M{"catalog_seeded": true}},
	)
	if err != nil {
		return false, err
	}
	return res.ModifiedCount > 0, nil
}

// ReleaseCatalogSeed clears the seeded flag after a failed seed so it can be retried.
func (r *TraineeRepository) ReleaseCatalogSeed(traineeID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(traineeID)
	if err != nil {
		return nil
	}
	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$unset": bson.M{"catalog_seeded": ""}})
	return err
}
