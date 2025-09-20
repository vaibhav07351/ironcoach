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

func (r *TrainerRepository) GetTrainers() ([]models.Trainer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var trainers []models.Trainer
	for cursor.Next(ctx) {
		var trainer models.Trainer
		if err := cursor.Decode(&trainer); err != nil {
			return nil, err
		}
		trainers = append(trainers, trainer)
	}
	return trainers, nil
}

// In `trainer_repository.go`
func (r *TrainerRepository) GetTrainerByID(id string) (models.Trainer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var trainer models.Trainer
	err := r.collection.FindOne(ctx, bson.M{"email": id}).Decode(&trainer)
	return trainer, err
}

// Delete trainer by email
func (r *TrainerRepository) DeleteTrainer(email string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := r.collection.DeleteOne(ctx, bson.M{"email": email})
	return err
}
