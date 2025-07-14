package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Exercise struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string             `bson:"name" json:"name" binding:"required"`
	Category   string             `bson:"category" json:"category" binding:"required"`
	CategoryID primitive.ObjectID `json:"category_id" bson:"category_id"`
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"` // Timestamp for record creation
	UpdatedAt  time.Time          `json:"updated_at" bson:"updated_at"` // Timestamp for last update
}
