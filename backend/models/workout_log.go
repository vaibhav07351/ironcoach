package models

import "time"

// Workout represents a single exercise in a workout log
type Workout struct {
	Exercise string    `json:"exercise" bson:"exercise"` // Exercise name
	Sets     int       `json:"sets" bson:"sets"`         // Number of sets
	Reps     []int     `json:"reps" bson:"reps"`         // Reps for each set
	Weight   []float64 `json:"weight" bson:"weight"`     // Weight used for each set
	Notes     string    `json:"notes,omitempty" bson:"notes,omitempty"` // Additional notes
}

// WorkoutLog represents a log entry for a trainee's workout
type WorkoutLog struct {
	ID        string    `bson:"_id,omitempty" json:"id"`                // Unique ID for the log
	TraineeID string    `json:"trainee_id" bson:"trainee_id"`           // Link to Trainee
	Date      string    `json:"date" bson:"date"`                       // Workout date (ISO 8601)
	Workouts  []Workout `json:"workouts" bson:"workouts"`               // List of exercises
	Notes     string    `json:"notes,omitempty" bson:"notes,omitempty"` // Additional notes
	CreatedAt time.Time `json:"created_at" bson:"created_at"`           // Timestamp for record creation
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`           // Timestamp for last update
}
