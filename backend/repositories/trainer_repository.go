package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type TrainerRepository struct {
	collection *mongo.Collection
}

// constructor for TrainerRepository
func NewTrainerRepository() *TrainerRepository {
	db := database.DB.Database("ironcoach")
	return &TrainerRepository{
		collection: db.Collection("trainers"),
	}
}

// Insert a new Trainer
func (r *TrainerRepository) CreateTrainer(trainer models.Trainer) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.InsertOne(ctx, trainer)
	return err
}

// Find trainer by email
func (r *TrainerRepository) FindByEmail(email string) (models.Trainer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var trainer models.Trainer
	err := r.collection.FindOne(ctx, bson.M{"email": email}).Decode(&trainer)
	return trainer, err
}
