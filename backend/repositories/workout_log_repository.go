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

type WorkoutLogRepository struct {
	collection *mongo.Collection
}

// Constructor for WorkoutLogRepository
func NewWorkoutLogRepository() *WorkoutLogRepository {
	db := database.Database()
	return &WorkoutLogRepository{
		collection: db.Collection("workout_logs"),
	}
}

// CreateWorkoutLog inserts a log. When the app supplies a client_id and a log with the same
// (trainee_id, client_id) already exists, the existing log is returned with created=false.
func (r *WorkoutLogRepository) CreateWorkoutLog(log models.WorkoutLog) (saved models.WorkoutLog, created bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid := primitive.NewObjectID()
	log.ID = ""
	doc, err := toDocWithID(log, oid)
	if err != nil {
		return models.WorkoutLog{}, false, err
	}
	if _, err := r.collection.InsertOne(ctx, doc); err != nil {
		if log.ClientID != "" && mongo.IsDuplicateKeyError(err) {
			var existing models.WorkoutLog
			findErr := r.collection.FindOne(ctx, bson.M{"trainee_id": log.TraineeID, "client_id": log.ClientID}).Decode(&existing)
			return existing, false, findErr
		}
		return models.WorkoutLog{}, false, err
	}
	log.ID = oid.Hex()
	return log, true, nil
}

// FindByID returns mongo.ErrNoDocuments for unknown or malformed ids.
func (r *WorkoutLogRepository) FindByID(id string) (models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var log models.WorkoutLog
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return log, mongo.ErrNoDocuments
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&log)
	return log, err
}

// GetWorkoutLogsByTrainee lists logs newest first. date (YYYY-MM-DD) narrows to one day.
func (r *WorkoutLogRepository) GetWorkoutLogsByTrainee(traineeID, date string, limit, offset int) ([]models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	query := bson.M{"trainee_id": traineeID}
	if date != "" {
		query["date"] = date
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))

	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	logs := []models.WorkoutLog{}
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// UpdateFields applies a $set to one log. found=false means no log has that id.
func (r *WorkoutLogRepository) UpdateFields(id string, set bson.M) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": set})
	if err != nil {
		return false, err
	}
	return res.MatchedCount > 0, nil
}

// DeleteWorkoutLog removes one log. found=false means no log has that id.
func (r *WorkoutLogRepository) DeleteWorkoutLog(id string) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return false, err
	}
	return res.DeletedCount > 0, nil
}

// DeleteWorkoutLogsByTrainees deletes all logs of the given trainees.
func (r *WorkoutLogRepository) DeleteWorkoutLogsByTrainees(traineeIDs []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if len(traineeIDs) == 0 {
		return nil
	}
	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}

// ActivityDates returns, per trainee, the distinct dates (YYYY-MM-DD) with a log on or after
// since. One query for any number of trainees (no per-trainee round trips).
func (r *WorkoutLogRepository) ActivityDates(traineeIDs []string, since string) (map[string][]string, error) {
	return distinctDatesByTrainee(r.collection, traineeIDs, since)
}

// distinctDatesByTrainee groups (trainee_id, date) pairs for the given trainees. Shared by the
// workout and diet repositories.
func distinctDatesByTrainee(coll *mongo.Collection, traineeIDs []string, since string) (map[string][]string, error) {
	out := make(map[string][]string, len(traineeIDs))
	if len(traineeIDs) == 0 {
		return out, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": bson.M{"$in": traineeIDs}, "date": bson.M{"$gte": since}}}},
		{{Key: "$group", Value: bson.M{"_id": bson.M{"t": "$trainee_id", "d": bson.M{"$substrBytes": bson.A{"$date", 0, 10}}}}}},
	}
	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID struct {
			T string `bson:"t"`
			D string `bson:"d"`
		} `bson:"_id"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.ID.T] = append(out[row.ID.T], row.ID.D)
	}
	return out, nil
}

// toDocWithID marshals v to a BSON document and sets _id to an ObjectID, so ids are stored
// consistently as ObjectIDs while models keep string ids.
func toDocWithID(v interface{}, oid primitive.ObjectID) (bson.M, error) {
	raw, err := bson.Marshal(v)
	if err != nil {
		return nil, err
	}
	var doc bson.M
	if err := bson.Unmarshal(raw, &doc); err != nil {
		return nil, err
	}
	doc["_id"] = oid
	return doc, nil
}
