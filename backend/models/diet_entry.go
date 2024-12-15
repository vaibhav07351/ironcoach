package models

import "time"

// Food represents an individual item in a meal
type Food struct {
	Name     string  `json:"name" bson:"name"`         // Name of the food
	Quantity float64 `json:"quantity" bson:"quantity"` // Quantity consumed
	Units    string  `json:"units" bson:"units"`       // Units (e.g., grams, cups)
	Calories float64 `json:"calories" bson:"calories"` // Calories for the food item
	Proteins float64 `json:"proteins" bson:"proteins"` // Protein content in grams
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
	TotalCalories float64   `json:"total_calories" bson:"total_calories"`   // Total calories for the day
	TotalProteins float64   `json:"total_proteins" bson:"total_proteins"`   // Total proteins for the day
	Notes         string    `json:"notes,omitempty" bson:"notes,omitempty"` // Additional notes
	CreatedAt     time.Time `json:"created_at" bson:"created_at"`           // Timestamp for record creation
	UpdatedAt     time.Time `json:"updated_at" bson:"updated_at"`           // Timestamp for last update
}
