package models

import "time"

// Food represents an individual item in a meal
type Food struct {
	Name       string  `json:"name" bson:"name"`
	Quantity   float64 `json:"quantity" bson:"quantity"`
	Units      string  `json:"units" bson:"units"`
	Calories   float64 `json:"calories" bson:"calories"`
	Proteins   float64 `json:"proteins" bson:"proteins"`
	Carbs      float64 `json:"carbs,omitempty" bson:"carbs,omitempty"`
	Fats       float64 `json:"fats,omitempty" bson:"fats,omitempty"`
	ExternalID string  `json:"external_id,omitempty" bson:"external_id,omitempty"`
	Brand      string  `json:"brand,omitempty" bson:"brand,omitempty"`
}

// Meal represents a single meal in a diet entry
type Meal struct {
	Name     string  `json:"name" bson:"name"`         // Meal name (e.g., Breakfast, Lunch)
	Calories float64 `json:"calories" bson:"calories"` // Total calories for the meal
	Proteins float64 `json:"proteins" bson:"proteins"` // Total protein for the meal
	Carbs    float64 `json:"carbs" bson:"carbs"`       // Total carbohydrate content
	Fats     float64 `json:"fats" bson:"fats"`         // Total fat content
	Foods    []Food  `json:"foods" bson:"foods"`       // List of foods in the meal
}

// DietEntry represents a log entry for a trainee's diet
type DietEntry struct {
	ID            string    `bson:"_id,omitempty" json:"id"`                // Unique ID for the diet entry
	TraineeID     string    `json:"trainee_id" bson:"trainee_id"`           // Link to Trainee
	Date          string    `json:"date" bson:"date"`                       // Date of the diet entry (ISO 8601)
	Meals         []Meal    `json:"meals" bson:"meals"`                     // List of meals
	TotalCalories float64   `json:"total_calories" bson:"total_calories"`
	TotalProteins float64   `json:"total_proteins" bson:"total_proteins"`
	TotalCarbs    float64   `json:"total_carbs,omitempty" bson:"total_carbs,omitempty"`
	TotalFats     float64   `json:"total_fats,omitempty" bson:"total_fats,omitempty"`
	Notes         string    `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" bson:"updated_at"`
}
