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
)

type DietEntryRepository struct {
	collection *mongo.Collection
}

// Constructor for DietEntryRepository
func NewDietEntryRepository() *DietEntryRepository {
	db := database.DB.Database("ironcoach")
	return &DietEntryRepository{
		collection: db.Collection("diet_entries"),
	}
}

// Create a new diet entry
func (r *DietEntryRepository) CreateDietEntry(entry models.DietEntry) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, entry)
	return err
}

// Get all diet entries for a trainee
func (r *DietEntryRepository) GetDietEntriesByTrainee(traineeID string, date string) ([]models.DietEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	query := bson.M{"trainee_id": traineeID}
	if date != "" {
		query["date"] = date // Filter by date if provided
	}

	cursor, err := r.collection.Find(ctx, query)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// Decode the results
	var dietEntries []models.DietEntry
	for cursor.Next(ctx) {
		var entry models.DietEntry
		if err := cursor.Decode(&entry); err != nil {
			return nil, err
		}
		dietEntries = append(dietEntries, entry)
	}

	return dietEntries, nil
}

// Get Diet Entry By ID
func (r *DietEntryRepository) GetDietEntryByID(entryID string) (models.DietEntry, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var entry models.DietEntry

	objectId, err := primitive.ObjectIDFromHex(entryID)
	if err != nil {
		return entry, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&entry)
	return entry, err
}

// Update a diet entry with date filter
func (r *DietEntryRepository) UpdateDietEntry(entryID string, updateData models.DietEntry) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(entryID)
	if err != nil {
		return errors.New("invalid ID format")
	}

	// Add date filter to the query
	filter := bson.M{
		"_id": objectID,
	}

	update := bson.M{"$set": updateData}

	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return err
	}

	if result.MatchedCount == 0 {
		return errors.New("not found or date mismatch")
	}

	return nil
}

// Delete a diet entry
func (r *DietEntryRepository) DeleteDietEntry(entryID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, _ := primitive.ObjectIDFromHex(entryID)
	_, err := r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

// Delete all diet entries by trainee IDs
func (r *DietEntryRepository) DeleteDietEntriesByTrainees(traineeIDs []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if len(traineeIDs) == 0 {
		return nil // No trainees to delete entries for
	}

	// TraineeID is stored as string in diet entries, so use string array directly
	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}
