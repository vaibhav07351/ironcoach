package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name" binding:"required"`
	TrainerID string             `bson:"trainer_id" json:"trainer_id"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`           // Timestamp for record creation
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`           // Timestamp for last update
}
