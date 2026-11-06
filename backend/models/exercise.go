package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Exercise types decide which numbers a set holds.
const (
	// ExerciseWeightReps is a loaded lift: weight x reps (the default).
	ExerciseWeightReps = "weight_reps"
	// ExerciseReps is a bodyweight movement: reps, with optional added weight.
	ExerciseReps = "reps"
	// ExerciseDistanceTime is cardio: distance and/or time per bout.
	ExerciseDistanceTime = "distance_time"
	// ExerciseTime is a timed hold (plank, wall sit).
	ExerciseTime = "time"
)

// IsValidExerciseType reports whether t is a known exercise type.
func IsValidExerciseType(t string) bool {
	switch t {
	case ExerciseWeightReps, ExerciseReps, ExerciseDistanceTime, ExerciseTime:
		return true
	}
	return false
}

// NormalizeExerciseType maps the empty value (exercises created before types existed) to the
// default weight x reps.
func NormalizeExerciseType(t string) string {
	if t == "" {
		return ExerciseWeightReps
	}
	return t
}

type Exercise struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string             `bson:"name" json:"name" binding:"required"`
	Category   string             `bson:"category" json:"category" binding:"required"`
	CategoryID primitive.ObjectID `json:"category_id" bson:"category_id"`
	// Type is one of the Exercise* constants; empty in old documents means weight x reps.
	Type      string    `bson:"type,omitempty" json:"type"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"` // Timestamp for record creation
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"` // Timestamp for last update
}
