package models


type Trainee struct {
    ID             string             `bson:"_id,omitempty" json:"id"`           // Unique identifier
    Name           string             `json:"name" bson:"name" binding:"required"` // Required trainee name
    DOB            string             `json:"dob" bson:"dob" binding:"required"` // Date of Birth (ISO 8601)
    Gender         string             `json:"gender" bson:"gender" binding:"required"` // Gender of the trainee
    Weight         float64            `json:"weight" bson:"weight" binding:"gte=0"`  // Current weight in kg
    Height         float64            `json:"height" bson:"height" binding:"gte=0"`  // Height in cm
    BMI            float64            `json:"bmi,omitempty" bson:"bmi,omitempty"`   // Computed BMI (optional)
    TrainerID      string             `json:"trainer_id" bson:"trainer_id" binding:"required"` // Link to Trainer
    StartDate      string             `json:"start_date" bson:"start_date"`      // Training start date
    Goals          string             `json:"goals" bson:"goals"`               // Training goals
    Notes          string             `json:"notes,omitempty" bson:"notes,omitempty"` // Optional notes
    ActiveStatus   bool               `json:"active_status" bson:"active_status"`   // Training status (active/inactive)
    ProgressMetrics map[string]float64 `json:"progress_metrics,omitempty" bson:"progress_metrics,omitempty"` // Metrics like body fat %, lift weights
    CreatedAt      string             `json:"created_at" bson:"created_at"`     // Creation timestamp
    UpdatedAt      string             `json:"updated_at" bson:"updated_at"`     // Update timestamp
}
