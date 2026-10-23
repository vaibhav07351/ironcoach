package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AttendanceRepository struct {
	collection *mongo.Collection
}

func NewAttendanceRepository() *AttendanceRepository {
	return &AttendanceRepository{collection: database.Database().Collection("attendance")}
}

// Mark records attendance for one day. It is an upsert on (trainee_id, date), so marking twice
// (a double tap or a retry) leaves exactly one record. created=false means it already existed.
func (r *AttendanceRepository) Mark(traineeID, date string) (created bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := r.collection.UpdateOne(ctx,
		bson.M{"trainee_id": traineeID, "date": date},
		bson.M{"$setOnInsert": bson.M{"trainee_id": traineeID, "date": date, "created_at": time.Now().UTC()}},
		options.Update().SetUpsert(true))
	if err != nil {
		// Two simultaneous upserts can race on the unique index; the loser found the day already marked.
		if mongo.IsDuplicateKeyError(err) {
			return false, nil
		}
		return false, err
	}
	return res.UpsertedCount > 0, nil
}

// Unmark removes attendance for one day. Removing a day that is not marked is not an error.
func (r *AttendanceRepository) Unmark(traineeID, date string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"trainee_id": traineeID, "date": date})
	return err
}

// ListDates returns the attended dates of one client in [from, to] (either bound may be empty),
// newest first, capped at limit.
func (r *AttendanceRepository) ListDates(traineeID, from, to string, limit int) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	query := bson.M{"trainee_id": traineeID}
	if rng := dateRange(from, to); rng != nil {
		query["date"] = rng
	}
	opts := options.Find().
		SetProjection(bson.M{"date": 1}).
		SetSort(bson.D{{Key: "date", Value: -1}}).
		SetLimit(int64(limit))
	cursor, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, err
	}
	var rows []models.Attendance
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	dates := make([]string, 0, len(rows))
	for _, row := range rows {
		dates = append(dates, row.Date)
	}
	return dates, nil
}

// TraineesOnDate returns which of the given trainees attended on a date, in one query.
func (r *AttendanceRepository) TraineesOnDate(traineeIDs []string, date string) (map[string]bool, error) {
	out := make(map[string]bool)
	if len(traineeIDs) == 0 {
		return out, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx,
		bson.M{"trainee_id": bson.M{"$in": traineeIDs}, "date": date},
		options.Find().SetProjection(bson.M{"trainee_id": 1}))
	if err != nil {
		return nil, err
	}
	var rows []models.Attendance
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.TraineeID] = true
	}
	return out, nil
}

// DeleteByTrainees deletes all attendance of the given trainees.
func (r *AttendanceRepository) DeleteByTrainees(traineeIDs []string) error {
	return deleteByTrainees(r.collection, traineeIDs)
}

func dateRange(from, to string) bson.M {
	rng := bson.M{}
	if from != "" {
		rng["$gte"] = from
	}
	if to != "" {
		rng["$lte"] = to
	}
	if len(rng) == 0 {
		return nil
	}
	return rng
}
