package repositories

import (
	"context"
	"ironcoach/database"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// nonEmptyString limits a unique index to documents where the field is a non-empty string, so
// records without the optional field (or with "") do not collide with each other.
func nonEmptyString(field string) bson.M {
	return bson.M{field: bson.M{"$type": "string", "$gt": ""}}
}

type collectionIndexes struct {
	collection string
	models     []mongo.IndexModel
}

func indexPlan() []collectionIndexes {
	return []collectionIndexes{
		{"users", []mongo.IndexModel{
			{Keys: bson.D{{Key: "google_sub", Value: 1}}, Options: options.Index().SetName("uniq_google_sub").SetUnique(true).SetPartialFilterExpression(nonEmptyString("google_sub"))},
			{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("uniq_email").SetUnique(true).SetPartialFilterExpression(nonEmptyString("email"))},
			{Keys: bson.D{{Key: "trainee_id", Value: 1}}, Options: options.Index().SetName("trainee_id").SetPartialFilterExpression(nonEmptyString("trainee_id"))},
		}},
		{"trainers", []mongo.IndexModel{
			{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetName("uniq_email").SetUnique(true)},
			// One profile per trainer account; the user id is the trainer's identity.
			{Keys: bson.D{{Key: "user_id", Value: 1}}, Options: options.Index().SetName("uniq_user_id").SetUnique(true).SetPartialFilterExpression(nonEmptyString("user_id"))},
			{Keys: bson.D{{Key: "discovery_visible", Value: 1}}, Options: options.Index().SetName("discovery_visible")},
		}},
		{"trainees", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainer_id", Value: 1}, {Key: "active_status", Value: 1}, {Key: "name", Value: 1}}, Options: options.Index().SetName("trainer_status_name")},
			// One client account per client record.
			{Keys: bson.D{{Key: "user_id", Value: 1}}, Options: options.Index().SetName("uniq_user_id").SetUnique(true).SetPartialFilterExpression(nonEmptyString("user_id"))},
		}},
		{"invites", []mongo.IndexModel{
			{Keys: bson.D{{Key: "code", Value: 1}}, Options: options.Index().SetName("uniq_code").SetUnique(true)},
			{Keys: bson.D{{Key: "trainee_id", Value: 1}}, Options: options.Index().SetName("trainee_id")},
		}},
		{"coach_requests", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainer_id", Value: 1}, {Key: "status", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("trainerid_status_created")},
			{Keys: bson.D{{Key: "client_user_id", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("client_created")},
		}},
		{"workout_logs", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("trainee_date")},
			// Idempotency for retried creates from the app.
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "client_id", Value: 1}}, Options: options.Index().SetName("uniq_trainee_client_id").SetUnique(true).SetPartialFilterExpression(nonEmptyString("client_id"))},
			{Keys: bson.D{{Key: "workouts.exercise_id", Value: 1}}, Options: options.Index().SetName("workout_exercise_id")},
		}},
		{"diet_entries", []mongo.IndexModel{
			// One diet entry per client per day.
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("uniq_trainee_date").SetUnique(true)},
		}},
		{"progress", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("uniq_trainee_date").SetUnique(true)},
		}},
		{"packages", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "start_date", Value: 1}}, Options: options.Index().SetName("trainee_start")},
			// Idempotency for retried creates from the app.
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "client_id", Value: 1}}, Options: options.Index().SetName("uniq_trainee_client_id").SetUnique(true).SetPartialFilterExpression(nonEmptyString("client_id"))},
		}},
		{"payments", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("trainee_date")},
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "client_id", Value: 1}}, Options: options.Index().SetName("uniq_trainee_client_id").SetUnique(true).SetPartialFilterExpression(nonEmptyString("client_id"))},
		}},
		{"attendance", []mongo.IndexModel{
			// One attendance record per client per day.
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "date", Value: -1}}, Options: options.Index().SetName("uniq_trainee_date").SetUnique(true)},
		}},
		{"categories", []mongo.IndexModel{
			{Keys: bson.D{{Key: "trainee_id", Value: 1}, {Key: "name", Value: 1}}, Options: options.Index().SetName("trainee_name")},
		}},
		{"exercises", []mongo.IndexModel{
			{Keys: bson.D{{Key: "category_id", Value: 1}, {Key: "name", Value: 1}}, Options: options.Index().SetName("category_name")},
		}},
		{"ratings", []mongo.IndexModel{
			{Keys: bson.D{{Key: "from_user_id", Value: 1}, {Key: "to_kind", Value: 1}, {Key: "to_id", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "to_kind", Value: 1}, {Key: "to_id", Value: 1}}, Options: options.Index().SetName("target")},
		}},
	}
}

// EnsureIndexes creates the indexes the queries rely on. Creating an existing index is a no-op.
// A failure (for example existing duplicate data blocking a unique index) is logged and the
// server keeps running, so a data problem can never put the API into a crash loop. It returns
// the number of collections whose indexes could not be created.
func EnsureIndexes() int {
	db := database.Database()
	failed := 0
	for _, ci := range indexPlan() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		_, err := db.Collection(ci.collection).Indexes().CreateMany(ctx, ci.models)
		cancel()
		if err != nil {
			failed++
			slog.Error("index creation failed; fix the data (e.g. remove duplicates) and restart",
				"collection", ci.collection, "err", err)
		}
	}
	return failed
}
