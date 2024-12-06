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

func (r *CategoryRepository) GetCategories() ([]models.Category, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := r.collection.Find(ctx, bson.M{})
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

func (r *CategoryRepository) IsCategoryExists(name string) (bool, error) {
    fmt.Println(r)
    if r.collection == nil {
        return false, fmt.Errorf("MongoDB collection is not initialized")
    }

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    result := r.collection.FindOne(ctx, bson.M{"name": name})
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
