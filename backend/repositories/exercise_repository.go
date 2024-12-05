package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
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

func (r *ExerciseRepository) GetExercisesByCategory(category string) ([]models.Exercise, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    cursor, err := r.collection.Find(ctx, bson.M{"category": category})
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
