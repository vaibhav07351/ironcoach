package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Workout represents a single exercise in a workout log
type Workout struct {
	Exercise   string             `json:"exercise" bson:"exercise"`               // Exercise name
	ExerciseID primitive.ObjectID `json:"exercise_id" bson:"exercise_id"`         // Link to Exercise
	Sets       int                `json:"sets" bson:"sets"`                       // Number of sets
	Reps       []int              `json:"reps" bson:"reps"`                       // Reps for each set
	Weight     []float64          `json:"weight" bson:"weight"`                   // Weight used for each set
	Notes      string             `json:"notes,omitempty" bson:"notes,omitempty"` // Additional notes
}

// WorkoutLog represents a log entry for a trainee's workout or sport session.
type WorkoutLog struct {
	ID           string          `bson:"_id,omitempty" json:"id"`
	TraineeID    string          `json:"trainee_id" bson:"trainee_id"`
	Date         string          `json:"date" bson:"date"`
	ActivityType string          `json:"activity_type,omitempty" bson:"activity_type,omitempty"`
	Workouts     []Workout       `json:"workouts,omitempty" bson:"workouts,omitempty"`
	Metrics      *SessionMetrics `json:"metrics,omitempty" bson:"metrics,omitempty"`
	Notes        string          `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt    time.Time       `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" bson:"updated_at"`
}
