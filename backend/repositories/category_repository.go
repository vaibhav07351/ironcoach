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

// Constructor for CategoryRepository
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

func (r *CategoryRepository) GetCategories(trainerID string) ([]models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Filter categories based on trainerID
	filter := bson.M{"trainer_id": trainerID}

	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	for cursor.Next(ctx) {
		var category models.Category
		if err := cursor.Decode(&category); err != nil {
			return nil, err
		}
		categories = append(categories, category)
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
	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objectId}, bson.M{"$set": bson.M{"name": updatedName}})
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
		bson.M{"$set": bson.M{"category": updatedCategoryName}},
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

func (r *CategoryRepository) IsCategoryExists(name string, trainerID string) (bool, error) {
	if r.collection == nil {
		return false, fmt.Errorf("MongoDB collection is not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := r.collection.FindOne(ctx, bson.M{"name": name, "trainer_id": trainerID})
	if result.Err() != nil {
		if result.Err() == mongo.ErrNoDocuments {
			return false, nil // Document does not exist
		}
		return false, result.Err() // Other errors
	}

	return true, nil // Document exists
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

// Delete all categories by trainer ID
func (r *CategoryRepository) DeleteCategoriesByTrainer(trainerID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := r.collection.DeleteMany(ctx, bson.M{"trainer_id": trainerID})
	return err
}

// Get all category IDs by trainer ID (for cascading deletes)
func (r *CategoryRepository) GetCategoryIDsByTrainer(trainerID string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := r.collection.Find(ctx, bson.M{"trainer_id": trainerID}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var categoryIDs []string
	for cursor.Next(ctx) {
		var result struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cursor.Decode(&result); err != nil {
			return nil, err
		}
		categoryIDs = append(categoryIDs, result.ID.Hex())
	}
	return categoryIDs, nil
}
