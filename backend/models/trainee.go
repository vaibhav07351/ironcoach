package models

import "time"

type Trainee struct {
	ID                string             `bson:"_id,omitempty" json:"id"`
	Name              string             `json:"name" bson:"name"`
	PhoneNumber       string             `json:"phone_number" bson:"phone_number"`
	Email             string             `json:"email,omitempty" bson:"email,omitempty"`
	UserID            string             `json:"user_id,omitempty" bson:"user_id,omitempty"`
	DOB               string             `json:"dob" bson:"dob"`
	Gender            string             `json:"gender" bson:"gender"`
	Profession        string             `json:"profession" bson:"profession"`
	Height            float64            `json:"height" bson:"height"`
	TrainerID         string             `json:"trainer_id" bson:"trainer_id"`
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

// TraineeRef is a lightweight projection used by roster views.
type TraineeRef struct {
	ID          string `bson:"_id" json:"id"`
	Name        string `bson:"name" json:"name"`
	PhoneNumber string `bson:"phone_number" json:"phone_number,omitempty"`
}

type FitnessTest struct {
	Date     string `json:"date" bson:"date"`
	Category string `json:"category" bson:"category"`
	Test     string `json:"test" bson:"test"`
	Result1  string `json:"result1" bson:"result1"`
	Result2  string `json:"result2,omitempty" bson:"result2,omitempty"`
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

// TraineeInput is the accepted body for creating a client and for editing one. Every field is
// optional on edit (nil = unchanged). Linkage and server-owned fields (trainer_id, user_id,
// rating, timestamps) are never accepted from the client.
type TraineeInput struct {
	Name              *string  `json:"name"`
	PhoneNumber       *string  `json:"phone_number"`
	Email             *string  `json:"email"`
	DOB               *string  `json:"dob"`
	Gender            *string  `json:"gender"`
	Profession        *string  `json:"profession"`
	Height            *float64 `json:"height"`
	StartDate         *string  `json:"start_date"`
	MembershipType    *string  `json:"membership_type"`
	EmergencyContact  *string  `json:"emergency_contact"`
	MedicalHistory    *string  `json:"medical_history"`
	SocialHandle      *string  `json:"social_handle"`
	Goals             *string  `json:"goals"`
	Notes             *string  `json:"notes"`
	ActiveStatus      *bool    `json:"active_status"`
	ImageURL          *string  `json:"image_url"`
	ActiveSupplements *string  `json:"active_supplements"`

	FitnessTests        *[]FitnessTest       `json:"fitness_tests"`
	LabTests            *[]LabTest           `json:"lab_tests"`
	HealthQuestionnaire *HealthQuestionnaire `json:"health_questionnaire"`
}
