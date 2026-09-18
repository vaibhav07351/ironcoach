package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category is a workout category owned by a trainee (client catalog).
type Category struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name" binding:"required"`
	TraineeID string             `bson:"trainee_id" json:"trainee_id" binding:"required"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time          `json:"updated_at" bson:"updated_at"`
}
