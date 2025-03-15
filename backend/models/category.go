package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name" binding:"required"`
	TrainerID string             `bson:"trainer_id" json:"trainer_id"`
}
