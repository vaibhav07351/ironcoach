package repositories

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ErrDuplicate is returned when a unique index rejects an insert.
var ErrDuplicate = errors.New("duplicate record")

type DietEntryRepository struct {
	collection *mongo.Collection
}

// Constructor for DietEntryRepository
func NewDietEntryRepository() *DietEntryRepository {
	db := database.Database()
	return &DietEntryRepository{
		collection: db.Collection("diet_entries"),
	}
}

// CreateDietEntry inserts an entry and returns its id. One entry per trainee per date is
// enforced by a unique index; a second insert returns ErrDuplicate.
func (r *DietEntryRepository) CreateDietEntry(entry models.DietEntry) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid := primitive.NewObjectID()
	entry.ID = ""
	doc, err := toDocWithID(entry, oid)
	if err != nil {
		return "", err
	}
	if _, err := r.collection.InsertOne(ctx, doc); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return "", ErrDuplicate
		}
		return "", err
	}
	return oid.Hex(), nil
}

// GetDietEntriesByTrainee lists entries newest first. date (YYYY-MM-DD) narrows to one day.
func (r *DietEntryRepository) GetDietEntriesByTrainee(traineeID, date string, limit, offset int) ([]models.DietEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	query := bson.M{"trainee_id": traineeID}
	if date != "" {
		query["date"] = date
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	entries := []models.DietEntry{}
	if err := cursor.All(ctx, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

// GetDietEntryByID returns mongo.ErrNoDocuments for unknown or malformed ids.
func (r *DietEntryRepository) GetDietEntryByID(entryID string) (models.DietEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var entry models.DietEntry
	oid, err := primitive.ObjectIDFromHex(entryID)
	if err != nil {
		return entry, mongo.ErrNoDocuments
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&entry)
	return entry, err
}

// UpdateFields applies a $set to one entry. found=false means no entry has that id.
func (r *DietEntryRepository) UpdateFields(entryID string, set bson.M) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(entryID)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set})
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}

// DeleteDietEntry removes one entry. found=false means no entry has that id.
func (r *DietEntryRepository) DeleteDietEntry(entryID string) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(entryID)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return false, err
	}
	return res.DeletedCount > 0, nil
}

// DeleteDietEntriesByTrainees deletes all entries of the given trainees.
func (r *DietEntryRepository) DeleteDietEntriesByTrainees(traineeIDs []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if len(traineeIDs) == 0 {
		return nil
	}
	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}

// ActivityDates returns, per trainee, the distinct dates with a diet entry on or after since.
func (r *DietEntryRepository) ActivityDates(traineeIDs []string, since string) (map[string][]string, error) {
	return distinctDatesByTrainee(r.collection, traineeIDs, since)
}
