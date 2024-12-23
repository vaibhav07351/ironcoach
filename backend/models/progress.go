package models

import "time"

type Progress struct {
	ID        string              `bson:"_id,omitempty" json:"id"`
	TraineeID string              `bson:"trainee_id" json:"trainee_id"` // Linked to Trainee
	WeightBMI []WeightBMIProgress `bson:"weight_bmi" json:"weight_bmi"`
	Exercises []ExerciseProgress  `bson:"exercises" json:"exercises"`
	CreatedAt time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time           `bson:"updated_at" json:"updated_at"`
}

type WeightBMIProgress struct {
	TraineeID string    `bson:"trainee_id" json:"trainee_id"` // Add this field
	Date      string    `bson:"date" json:"date"`             // Format YYYY-MM-DD
	Weight    float64   `bson:"weight" json:"weight"`
	BMI       float64   `bson:"bmi" json:"bmi"`
	BodyFat   float64   `bson:"body_fat,omitempty" json:"body_fat,omitempty"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

type ExerciseProgress struct {
	Exercise  string           `bson:"exercise" json:"exercise"`
	MaxWeight float64          `bson:"max_weight" json:"max_weight"`
	AvgWeight float64          `bson:"avg_weight" json:"avg_weight"`
	Records   []ExerciseRecord `bson:"records" json:"records"`
}

type ExerciseRecord struct {
	Date   string  `bson:"date" json:"date"` // Format YYYY-MM-DD
	Weight float64 `bson:"weight" json:"weight"`
	Reps   int     `bson:"reps" json:"reps"`
}
