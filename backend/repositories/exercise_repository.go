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

	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}}).SetLimit(500)
	cursor, err := r.collection.Find(ctx, bson.M{"category_id": objectID}, opts)
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

	objectId, err := primitive.ObjectIDFromHex(exerciseID)
	if err != nil {
		return err
	}

	logs := r.collection.Database().Collection("workout_logs")

	// Pull matching workout entries only — do not wipe entire logs.
	if _, err = logs.UpdateMany(
		ctx,
		bson.M{"workouts.exercise_id": objectId},
		bson.M{"$pull": bson.M{"workouts": bson.M{"exercise_id": objectId}}},
	); err != nil {
		return err
	}

	// Clean up logs that no longer have any workouts.
	_, err = logs.DeleteMany(ctx, bson.M{"workouts": bson.M{"$size": 0}})
	return err
}

// DeleteExercisesByCategoryID deletes all exercises in a category by category ID
func (r *ExerciseRepository) DeleteExercisesByCategoryID(categoryID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return err
	}

	cursor, err := r.collection.Find(ctx, bson.M{"category_id": objectID}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	var exerciseIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			return err
		}
		exerciseIDs = append(exerciseIDs, result.ID)
	}

	logs := r.collection.Database().Collection("workout_logs")
	if len(exerciseIDs) > 0 {
		if _, err = logs.UpdateMany(
			ctx,
			bson.M{"workouts.exercise_id": bson.M{"$in": exerciseIDs}},
			bson.M{"$pull": bson.M{"workouts": bson.M{"exercise_id": bson.M{"$in": exerciseIDs}}}},
		); err != nil {
			return err
		}
		if _, err = logs.DeleteMany(ctx, bson.M{"workouts": bson.M{"$size": 0}}); err != nil {
			return err
		}
	}

	_, err = r.collection.DeleteMany(ctx, bson.M{"category_id": objectID})
	return err
}

func (r *ExerciseRepository) IsExerciseExists(name string, categoryID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	categoryObjectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return false, err
	}

	count, err := r.collection.CountDocuments(ctx, bson.M{"name": name, "category_id": categoryObjectID})
	return count > 0, err
}

func (r *ExerciseRepository) GetExerciseByID(id string) (models.Exercise, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Exercise{}, err
	}

	var exercise models.Exercise
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&exercise)
	return exercise, err
}

func (r *ExerciseRepository) IsExerciseExistsInCategory(name string, categoryID string, excludeID string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	excludeObjectID, err := primitive.ObjectIDFromHex(excludeID)
	if err != nil {
		return false, err
	}

	categoryObjectID, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return false, err
	}

	count, err := r.collection.CountDocuments(ctx, bson.M{
		"name":        name,
		"category_id": categoryObjectID,
		"_id":         bson.M{"$ne": excludeObjectID},
	})
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
