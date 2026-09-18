package repositories

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/models"
	"strconv"
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
	db := database.DB.Database("ironcoach")
	return &TraineeRepository{
		collection: db.Collection("trainees"),
	}
}

// Add a new trainee
func (r *TraineeRepository) CreateTrainee(trainee models.Trainee) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var oid primitive.ObjectID
	var err error
	if trainee.ID == "" {
		oid = primitive.NewObjectID()
		trainee.ID = oid.Hex()
	} else {
		oid, err = primitive.ObjectIDFromHex(trainee.ID)
		if err != nil {
			return "", err
		}
	}

	doc := bson.M{
		"_id":                oid,
		"name":               trainee.Name,
		"phone_number":       trainee.PhoneNumber,
		"email":              trainee.Email,
		"user_id":            trainee.UserID,
		"dob":                trainee.DOB,
		"gender":             trainee.Gender,
		"profession":         trainee.Profession,
		"height":             trainee.Height,
		"trainer_id":         trainee.TrainerID,
		"start_date":         trainee.StartDate,
		"membership_type":    trainee.MembershipType,
		"emergency_contact":  trainee.EmergencyContact,
		"medical_history":    trainee.MedicalHistory,
		"social_handle":      trainee.SocialHandle,
		"goals":              trainee.Goals,
		"notes":              trainee.Notes,
		"active_status":      trainee.ActiveStatus,
		"progress_metrics":   trainee.ProgressMetrics,
		"created_at":         trainee.CreatedAt,
		"updated_at":         trainee.UpdatedAt,
		"image_url":          trainee.ImageURL,
		"active_supplements": trainee.ActiveSupplements,
	}

	_, err = r.collection.InsertOne(ctx, doc)
	return trainee.ID, err
}

func (r *TraineeRepository) GetTraineesByTrainer(trainerID string, status string) ([]models.Trainee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var trainees []models.Trainee

	// Build the query based on the inputs
	query := bson.M{"trainer_id": trainerID}

	// Convert `status` string to boolean if it's not empty
	if status != "" {
		activeStatus, err := strconv.ParseBool(status)
		if err != nil {
			return nil, err // Handle invalid status values gracefully
		}
		query["active_status"] = activeStatus
	}

	// Perform the query
	cursor, err := r.collection.Find(ctx, query)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// Decode the results
	for cursor.Next(ctx) {
		var trainee models.Trainee
		if err := cursor.Decode(&trainee); err != nil {
			return nil, err
		}
		trainees = append(trainees, trainee)
	}

	return trainees, nil
}

// Get trainee by ID
func (r *TraineeRepository) GetTraineeByID(id string) (models.Trainee, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var trainee models.Trainee
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return trainee, errors.New("invalid trainee ID format")
	}

	var raw bson.M
	if err := r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&raw); err != nil {
		return trainee, err
	}
	raw["_id"] = objectID.Hex()
	bytes, err := bson.Marshal(raw)
	if err != nil {
		return trainee, err
	}
	if err := bson.Unmarshal(bytes, &trainee); err != nil {
		return trainee, err
	}
	trainee.ID = objectID.Hex()
	return trainee, nil
}

// Update a trainee
func (r *TraineeRepository) UpdateTrainee(id string, update map[string]interface{}) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Convert the id to MongoDB's ObjectID type
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid trainee ID format")
	}

	// Apply the update
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": objectID}, // Match by ID
		bson.M{"$set": update},  // Apply updates
	)
	if err != nil {
		return err
	}

	// Check if the document was actually updated
	if result.ModifiedCount == 0 {
		return errors.New("no document updated, trainee not found or no changes applied")
	}

	return nil
}

// Delete a trainee
func (r *TraineeRepository) DeleteTrainee(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Convert the id to MongoDB's ObjectID type
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return errors.New("invalid trainee ID format")
	}

	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

// Delete all trainees by trainer ID
func (r *TraineeRepository) DeleteTraineesByTrainer(trainerID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainer_id": trainerID})
	return err
}

// Get all trainee IDs by trainer ID (for cascading deletes)
func (r *TraineeRepository) GetTraineeIDsByTrainer(trainerID string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx, bson.M{"trainer_id": trainerID}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var traineeIDs []string
	for cursor.Next(ctx) {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		traineeIDs = append(traineeIDs, result.ID.Hex())
	}
	return traineeIDs, nil
}
