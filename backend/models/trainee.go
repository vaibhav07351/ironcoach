package models

import "time"

type Trainee struct {
	ID                string             `bson:"_id,omitempty" json:"id"`
	Name              string             `json:"name" bson:"name" binding:"required"`
	PhoneNumber       string             `json:"phone_number" bson:"phone_number" binding:"required"`
	Email             string             `json:"email,omitempty" bson:"email,omitempty"`
	UserID            string             `json:"user_id,omitempty" bson:"user_id,omitempty"`
	DOB               string             `json:"dob" bson:"dob" binding:"required"`
	Gender            string             `json:"gender" bson:"gender" binding:"required"`
	Profession        string             `json:"profession" bson:"profession"`
	Height            float64            `json:"height" bson:"height" binding:"gte=0"`
	TrainerID         string             `json:"trainer_id" bson:"trainer_id" binding:"required"`
	StartDate         string             `json:"start_date" bson:"start_date"`
	MembershipType    string             `json:"membership_type" bson:"membership_type"`
	EmergencyContact  string             `json:"emergency_contact" bson:"emergency_contact"`
	MedicalHistory    string             `json:"medical_history,omitempty" bson:"medical_history,omitempty"`
	SocialHandle      string             `json:"social_handle,omitempty" bson:"social_handle,omitempty"`
	Goals             string             `json:"goals" bson:"goals"`
	Notes             string             `json:"notes,omitempty" bson:"notes,omitempty"`
	ActiveStatus      bool               `json:"active_status" bson:"active_status"`
	Rating            float64            `json:"rating" bson:"rating"`
	RatingCount       int                `json:"rating_count" bson:"rating_count"`
	ProgressMetrics   map[string]float64 `json:"progress_metrics,omitempty" bson:"progress_metrics,omitempty"`
	CreatedAt         time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at" bson:"updated_at"`
	ImageURL          string             `json:"image_url,omitempty" bson:"image_url,omitempty"`
	ActiveSupplements string             `json:"active_supplements" bson:"active_supplements"`

	FitnessTests        []FitnessTest        `json:"fitness_tests,omitempty" bson:"fitness_tests,omitempty"`
	LabTests            []LabTest            `json:"lab_tests,omitempty" bson:"lab_tests,omitempty"`
	HealthQuestionnaire *HealthQuestionnaire `json:"health_questionnaire,omitempty" bson:"health_questionnaire,omitempty"`
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