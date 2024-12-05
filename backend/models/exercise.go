package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Exercise struct {
    ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Name     string             `bson:"name" json:"name" binding:"required"`
    Category string             `bson:"category" json:"category" binding:"required"`
}
