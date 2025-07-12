package models

import "time"

type Trainee struct {
	ID                string             `bson:"_id,omitempty" json:"id"`                                      // Unique identifier
	Name              string             `json:"name" bson:"name" binding:"required"`                          // Required trainee name
	PhoneNumber       string             `json:"phone_number" bson:"phone_number" binding:"required"`          // Phone number of the trainee
	DOB               string             `json:"dob" bson:"dob" binding:"required"`                            // Date of Birth (ISO 8601)
	Gender            string             `json:"gender" bson:"gender" binding:"required"`                      // Gender of the trainee
	Profession        string             `json:"profession" bson:"profession"`                                 // Profession of the trainee
	// Weight            float64            `json:"weight" bson:"weight" binding:"gte=0"`                         // Current weight in kg
	Height            float64            `json:"height" bson:"height" binding:"gte=0"`                         // Height in cm
	// BMI               float64            `json:"bmi,omitempty" bson:"bmi,omitempty"`                           // Computed BMI (optional)
	TrainerID         string             `json:"trainer_id" bson:"trainer_id" binding:"required"`              // Link to Trainer
	StartDate         string             `json:"start_date" bson:"start_date"`                                 // Training start date
	MembershipType    string             `json:"membership_type" bson:"membership_type"`                       // Type of membership (e.g., Basic, Premium)
	EmergencyContact  string             `json:"emergency_contact" bson:"emergency_contact"`                   // Emergency contact details
	MedicalHistory    string             `json:"medical_history,omitempty" bson:"medical_history,omitempty"`   // Medical history
	SocialHandle      string             `json:"social_handle,omitempty" bson:"social_handle,omitempty"`       // Social media handle
	Goals             string             `json:"goals" bson:"goals"`                                           // Training goals
	Notes             string             `json:"notes,omitempty" bson:"notes,omitempty"`                       // Optional notes
	ActiveStatus      bool               `json:"active_status" bson:"active_status"`                           // Training status (active/inactive)
	ProgressMetrics   map[string]float64 `json:"progress_metrics,omitempty" bson:"progress_metrics,omitempty"` // Metrics like body fat %, lift weights
	CreatedAt         time.Time          `json:"created_at" bson:"created_at"`                                 // Creation timestamp
	UpdatedAt         time.Time          `json:"updated_at" bson:"updated_at"`                                 // Update timestamp
	ImageURL          string             `json:"image_url,omitempty" bson:"image_url,omitempty"`               // Add image URL field
	ActiveSupplements string             `json:"active_supplements" bson:"active_supplements"`                 // Training start date

 	FitnessTests         []FitnessTest       `json:"fitness_tests,omitempty" bson:"fitness_tests,omitempty"`
    LabTests             []LabTest           `json:"lab_tests,omitempty" bson:"lab_tests,omitempty"`
    HealthQuestionnaire  *HealthQuestionnaire `json:"health_questionnaire,omitempty" bson:"health_questionnaire,omitempty"`
}

type FitnessTest struct {
    Date         string `json:"date" bson:"date"`
    Category     string `json:"category" bson:"category"`
    Test         string `json:"test" bson:"test"`
    Result1      string `json:"result1" bson:"result1"`
    Result2      string `json:"result2,omitempty" bson:"result2,omitempty"`
}

type LabTest struct {
    Date     string `json:"date" bson:"date"`         
    Category string `json:"category" bson:"category"` 
    Test     string `json:"test" bson:"test"`         
    Value    string `json:"value" bson:"value"`
}

type HealthQuestionnaire struct {
    Responses map[string]bool `json:"responses" bson:"responses"`
    Comments  string          `json:"comments" bson:"comments"`
}