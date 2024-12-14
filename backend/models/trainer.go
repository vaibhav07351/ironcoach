package models

import "time"

type Trainer struct {
	Name           string    `json:"name" bson:"name" validate:"required"`
	Email          string    `json:"email" bson:"email" validate:"required,email"`
	Password       string    `json:"password" bson:"password" validate:"required,min=5"`
	ImageURL       string    `json:"image_url,omitempty" bson:"image_url,omitempty"` // Add image URL field
	PhoneNumber    string    `json:"phone_number" bson:"phone_number" validate:"required,len=10"`
	Address        string    `json:"address" bson:"address"`
	Speciality     string    `json:"speciality" bson:"speciality"`
	DateOfBirth    string    `json:"date_of_birth" bson:"date_of_birth" validate:"required"`
	Gender         string    `json:"gender" bson:"gender" validate:"required,oneof=male female other"`
	Experience     int       `json:"experience" bson:"experience" validate:"required,gte=0"`
	Certifications []string  `json:"certifications" bson:"certifications"`
	HourlyRate     float64   `json:"hourly_rate" bson:"hourly_rate" validate:"gte=0"`
	Bio            string    `json:"bio" bson:"bio"`
	SocialHandle   string    `json:"social_handle,omitempty" bson:"social_handle,omitempty"` // Social media handle
	Availability   string    `json:"availability" bson:"availability"`
	Rating         float64   `json:"rating" bson:"rating" validate:"gte=0,lte=5"`
	TrainerType    string    `json:"trainer_type" bson:"trainer_type" validate:"required,oneof=personal group online rehabilitation"`
	CreatedAt      time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" bson:"updated_at"`
}
