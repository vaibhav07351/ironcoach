package repositories

import (
	"context"
	"errors"
	"ironcoach/database"
	"ironcoach/models"
	"sort"
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

// exerciseDayFilter matches the one keyed log of an exercise on a day.
func exerciseDayFilter(traineeID, date, exerciseKey string) bson.M {
	return bson.M{"trainee_id": traineeID, "date": date, "exercise_key": exerciseKey}
}

// FindExerciseDay returns the keyed log of an exercise on a day, or nil when there is none.
func (r *WorkoutLogRepository) FindExerciseDay(traineeID, date, exerciseKey string) (*models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var log models.WorkoutLog
	err := r.collection.FindOne(ctx, exerciseDayFilter(traineeID, date, exerciseKey)).Decode(&log)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// UpsertExerciseDay creates or replaces the keyed log of an exercise on a day and returns it.
// The unique (trainee_id, date, exercise_key) index makes concurrent first saves safe: the loser
// of the race gets a duplicate-key error and is retried once as a plain update.
func (r *WorkoutLogRepository) UpsertExerciseDay(traineeID, date, exerciseKey string, set bson.M) (models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	now := time.Now().UTC()
	set["updated_at"] = now
	update := bson.M{
		"$set":         set,
		"$setOnInsert": bson.M{"created_at": now},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)

	var log models.WorkoutLog
	err := r.collection.FindOneAndUpdate(ctx, exerciseDayFilter(traineeID, date, exerciseKey), update, opts).Decode(&log)
	if mongo.IsDuplicateKeyError(err) {
		err = r.collection.FindOneAndUpdate(ctx, exerciseDayFilter(traineeID, date, exerciseKey), update, opts).Decode(&log)
	}
	return log, err
}

// DeleteExerciseDay removes the keyed log of an exercise on a day (no error when absent).
func (r *WorkoutLogRepository) DeleteExerciseDay(traineeID, date, exerciseKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, exerciseDayFilter(traineeID, date, exerciseKey))
	return err
}

// ExerciseLogQuery narrows FindByExercise. Dates are YYYY-MM-DD; empty means unbounded.
type ExerciseLogQuery struct {
	TraineeID  string
	ExerciseID primitive.ObjectID
	From       string // date >= From
	Before     string // date < Before
	Limit      int
	Offset     int
}

// FindByExercise lists logs containing an exercise, newest first, projecting only that exercise's
// entry (old logs may hold several exercises).
func (r *WorkoutLogRepository) FindByExercise(q ExerciseLogQuery) ([]models.WorkoutLog, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": q.TraineeID, "workouts.exercise_id": q.ExerciseID}
	dateRange := bson.M{}
	if q.From != "" {
		dateRange["$gte"] = q.From
	}
	if q.Before != "" {
		dateRange["$lt"] = q.Before
	}
	if len(dateRange) > 0 {
		filter["date"] = dateRange
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}}).
		SetProjection(bson.M{
			"trainee_id": 1, "date": 1, "notes": 1, "exercise_key": 1, "activity_type": 1, "created_at": 1,
			"workouts": bson.M{"$elemMatch": bson.M{"exercise_id": q.ExerciseID}},
		}).
		SetLimit(int64(q.Limit)).
		SetSkip(int64(q.Offset))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	logs := []models.WorkoutLog{}
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// ExerciseLogsSince lists the exercise logs (gym and cardio, not sport sessions) of the given
// trainees on or after since, newest first, projecting only what stats need. limit caps the read.
func (r *WorkoutLogRepository) ExerciseLogsSince(traineeIDs []string, since string, limit int) ([]models.WorkoutLog, error) {
	logs := []models.WorkoutLog{}
	if len(traineeIDs) == 0 {
		return logs, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": bson.M{"$in": traineeIDs}, "workouts.0": bson.M{"$exists": true}}
	if since != "" {
		filter["date"] = bson.M{"$gte": since}
	}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetProjection(bson.M{"trainee_id": 1, "date": 1, "workouts": 1, "exercise_key": 1}).
		SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// LogsForExercises lists logs of the given trainees that contain any of the exercises, oldest
// first, capped by limit. Used to find earlier bests for recent personal records.
func (r *WorkoutLogRepository) LogsForExercises(traineeIDs []string, exerciseIDs []primitive.ObjectID, limit int) ([]models.WorkoutLog, error) {
	logs := []models.WorkoutLog{}
	if len(traineeIDs) == 0 || len(exerciseIDs) == 0 {
		return logs, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": bson.M{"$in": traineeIDs}, "workouts.exercise_id": bson.M{"$in": exerciseIDs}}
	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetProjection(bson.M{"trainee_id": 1, "date": 1, "workouts": 1}).
		SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// ActivityDayCounts counts, per activity type, the distinct days a trainee logged it on or after
// since. Logs without a type are gym logs from before types existed.
func (r *WorkoutLogRepository) ActivityDayCounts(traineeID, since string) ([]models.ActivityCount, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": traineeID, "date": bson.M{"$gte": since}}}},
		{{Key: "$group", Value: bson.M{"_id": bson.M{
			"a": bson.M{"$ifNull": bson.A{"$activity_type", "gym"}},
			"d": "$date",
		}}}},
		{{Key: "$group", Value: bson.M{"_id": "$_id.a", "days": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.D{{Key: "days", Value: -1}, {Key: "_id", Value: 1}}}},
	}
	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID   string `bson:"_id"`
		Days int    `bson:"days"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	out := make([]models.ActivityCount, 0, len(rows))
	for _, row := range rows {
		out = append(out, models.ActivityCount{ActivityType: row.ID, Days: row.Days})
	}
	return out, nil
}

// LoggedDates returns the distinct dates (YYYY-MM-DD, ascending) with any log for a trainee in
// [from, to]. A month has at most 31, so the result is small.
func (r *WorkoutLogRepository) LoggedDates(traineeID, from, to string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	raw, err := r.collection.Distinct(ctx, "date", bson.M{"trainee_id": traineeID, "date": bson.M{"$gte": from, "$lte": to}})
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(raw))
	for _, v := range raw {
		if s, ok := v.(string); ok {
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out, nil
}
