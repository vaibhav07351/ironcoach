package repositories

import (
	"context"
	"fmt"
	"ironcoach/database"
	"ironcoach/models"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ExerciseRepository struct {
	collection *mongo.Collection
}

// Constructor for ExerciseRepository
func NewExerciseRepository() *ExerciseRepository {
	db := database.DB.Database("ironcoach")
	return &ExerciseRepository{
		collection: db.Collection("exercises"),
	}
}

func (r *ExerciseRepository) AddExercise(exercise models.Exercise) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := r.collection.InsertOne(ctx, exercise)
	return err
}

func (r *ExerciseRepository) GetExercisesByCategoryID(categoryID string) ([]models.Exercise, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return nil, err
	}

	cursor, err := r.collection.Find(ctx, bson.M{"category_id": objectID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var exercises []models.Exercise
	for cursor.Next(ctx) {
		var exercise models.Exercise
		if err := cursor.Decode(&exercise); err != nil {
			return nil, err
		}
		exercises = append(exercises, exercise)
	}
	return exercises, nil
}

func (r *ExerciseRepository) UpdateExercise(id string, updatedName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objectId}, bson.M{"$set": bson.M{"name": updatedName}})
	return err
}

func (r *ExerciseRepository) CascadeUpdateExerciseInWorkoutLogs(exerciseID string, updatedName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectId, err := primitive.ObjectIDFromHex(exerciseID)
	if err != nil {
		return err
	}

	_, err = r.collection.Database().Collection("workout_logs").UpdateMany(
		ctx,
		bson.M{"workouts.exercise_id": objectId},
		bson.M{"$set": bson.M{"workouts.$[elem].exercise": updatedName}},
		options.Update().SetArrayFilters(options.ArrayFilters{
			Filters: []interface{}{
				bson.M{"elem.exercise_id": objectId},
			},
		}),
	)
	return err
}

func (r *ExerciseRepository) DeleteExercise(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectId})
	return err
}

func (r *ExerciseRepository) CascadeDeleteExerciseFromWorkoutLogs(exerciseID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert exerciseID to ObjectID
	objectId, err := primitive.ObjectIDFromHex(exerciseID)
	if err != nil {
		return err
	}

	// Delete records from "workout_logs" where "workouts.exercise_id" matches
	_, err = r.collection.Database().Collection("workout_logs").DeleteMany(
		ctx,
		bson.M{"workouts.exercise_id": objectId},
	)
	return err
}

// DeleteExercisesByCategoryID deletes all exercises in a category by category ID
func (r *ExerciseRepository) DeleteExercisesByCategoryID(categoryID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Convert category ID to ObjectID
	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return err
	}

	// Step 1: Find all exercises in the specified category
	cursor, err := r.collection.Find(ctx, bson.M{"category_id": objectID})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var exercises []bson.M
	if err := cursor.All(ctx, &exercises); err != nil {
		return err
	}

	// Step 2: Extract exercise IDs
	var exerciseIDs []primitive.ObjectID
	for _, exercise := range exercises {
		if id, ok := exercise["_id"].(primitive.ObjectID); ok {
			exerciseIDs = append(exerciseIDs, id)
		}
	}

	// Step 3: Delete logs in "workout_logs" for these exercises
	if len(exerciseIDs) > 0 {
		_, err = r.collection.Database().Collection("workout_logs").DeleteMany(
			ctx,
			bson.M{"workouts.exercise_id": bson.M{"$in": exerciseIDs}},
		)
		if err != nil {
			return err
		}
	}

	// Step 4: Delete exercises in the specified category
	_, err = r.collection.DeleteMany(ctx, bson.M{"category_id": objectID})
	return err
}

func (r *ExerciseRepository) IsExerciseExists(name string, category string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := r.collection.CountDocuments(ctx, bson.M{"name": name, "category": category})
	return count > 0, err
}

func (r *ExerciseRepository) MigrateWorkoutLogs() {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()

	db := database.DB.Database("ironcoach")
	workoutLogs := db.Collection("workout_logs")
	exercises := db.Collection("exercises")

	cursor, err := workoutLogs.Find(ctx, bson.M{})
	if err != nil {
		log.Fatalf("Failed to fetch workout logs: %v", err)
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var log struct {
			ID       primitive.ObjectID `bson:"_id"`
			Workouts []struct {
				Exercise string `bson:"exercise"`
			} `bson:"workouts"`
		}

		if err := cursor.Decode(&log); err != nil {
			// log.Printf("Failed to decode workout log: %v", err)
			continue
		}

		for i, workout := range log.Workouts {
			var exercise struct {
				ID primitive.ObjectID `bson:"_id"`
			}
			err := exercises.FindOne(ctx, bson.M{"name": workout.Exercise}).Decode(&exercise)
			if err != nil {
				// log.Printf("Failed to find exercise for %s: %v", workout.Exercise, err)
				continue
			}

			// Update the workout log to include exercise_id
			_, err = workoutLogs.UpdateOne(ctx, bson.M{"_id": log.ID}, bson.M{
				"$set": bson.M{fmt.Sprintf("workouts.%d.exercise_id", i): exercise.ID},
			})
			if err != nil {
				// log.Printf("Failed to update workout log: %v", err)
			}
		}
	}
	log.Println("Migration completed successfully!")
}
