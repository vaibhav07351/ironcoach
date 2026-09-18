package repositories

import (
	"context"
	"fmt"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CategoryRepository struct {
	collection *mongo.Collection
}

func NewCategoryRepository() *CategoryRepository {
	db := database.DB.Database("ironcoach")
	return &CategoryRepository{
		collection: db.Collection("categories"),
	}
}

func (r *CategoryRepository) AddCategory(category models.Category) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err := r.collection.InsertOne(ctx, category)
	return err
}

func (r *CategoryRepository) GetCategoriesByTrainee(traineeID string) ([]models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"trainee_id": traineeID}
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}}).SetLimit(200)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, err
	}
	if categories == nil {
		categories = []models.Category{}
	}
	return categories, nil
}

func (r *CategoryRepository) UpdateCategory(id string, updatedName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objectId}, bson.M{
		"$set": bson.M{"name": updatedName, "updated_at": time.Now()},
	})
	return err
}

func (r *CategoryRepository) CascadeUpdateCategoryInExercises(categoryID string, updatedCategoryName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objectId, err := primitive.ObjectIDFromHex(categoryID)
	if err != nil {
		return err
	}

	_, err = r.collection.Database().Collection("exercises").UpdateMany(
		ctx,
		bson.M{"category_id": objectId},
		bson.M{"$set": bson.M{"category": updatedCategoryName, "updated_at": time.Now()}},
	)
	return err
}

func (r *CategoryRepository) DeleteCategory(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectId})
	return err
}

func (r *CategoryRepository) IsCategoryExists(name string, traineeID string, excludeID string) (bool, error) {
	if r.collection == nil {
		return false, fmt.Errorf("MongoDB collection is not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"name": name, "trainee_id": traineeID}
	if excludeID != "" {
		oid, err := primitive.ObjectIDFromHex(excludeID)
		if err != nil {
			return false, err
		}
		filter["_id"] = bson.M{"$ne": oid}
	}

	result := r.collection.FindOne(ctx, filter)
	if result.Err() != nil {
		if result.Err() == mongo.ErrNoDocuments {
			return false, nil
		}
		return false, result.Err()
	}
	return true, nil
}

func (r *CategoryRepository) GetCategoryByID(id string) (models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var category models.Category
	objectId, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return category, err
	}

	err = r.collection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&category)
	return category, err
}

func (r *CategoryRepository) DeleteCategoriesByTrainee(traineeID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainee_id": traineeID})
	return err
}

// DeleteCategoriesByTrainer removes legacy trainer-scoped categories (pre-client-catalog).
func (r *CategoryRepository) DeleteCategoriesByTrainer(trainerID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainer_id": trainerID})
	return err
}
