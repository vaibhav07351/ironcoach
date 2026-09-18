package models

import "time"

type Trainer struct {
	Name             string    `json:"name" bson:"name" validate:"required"`
	Email            string    `json:"email" bson:"email" validate:"required,email"`
	Password         string    `json:"-" bson:"password,omitempty"`
	ImageURL         string    `json:"image_url,omitempty" bson:"image_url,omitempty"`
	PhoneNumber      string    `json:"phone_number" bson:"phone_number" validate:"required,len=10"`
	Address          string    `json:"address" bson:"address"`
	Speciality       string    `json:"speciality" bson:"speciality"`
	DateOfBirth      string    `json:"date_of_birth" bson:"date_of_birth" validate:"required"`
	Gender           string    `json:"gender" bson:"gender" validate:"required,oneof=male female other"`
	Experience       int       `json:"experience" bson:"experience" validate:"required,gte=0"`
	Certifications   []string  `json:"certifications" bson:"certifications"`
	HourlyRate       float64   `json:"hourly_rate" bson:"hourly_rate" validate:"gte=0"`
	Bio              string    `json:"bio" bson:"bio"`
	SocialHandle     string    `json:"social_handle,omitempty" bson:"social_handle,omitempty"`
	Availability     string    `json:"availability" bson:"availability"`
	Rating           float64   `json:"rating" bson:"rating" validate:"gte=0,lte=5"`
	RatingCount      int       `json:"rating_count" bson:"rating_count"`
	TrainerType      string    `json:"trainer_type" bson:"trainer_type" validate:"required,oneof=personal group online rehabilitation"`
	Headline         string    `json:"headline,omitempty" bson:"headline,omitempty"`
	City             string    `json:"city,omitempty" bson:"city,omitempty"`
	Area             string    `json:"area,omitempty" bson:"area,omitempty"`
	Pincode          string    `json:"pincode,omitempty" bson:"pincode,omitempty"`
	Latitude         float64   `json:"latitude,omitempty" bson:"latitude,omitempty"`
	Longitude        float64   `json:"longitude,omitempty" bson:"longitude,omitempty"`
	DiscoveryVisible bool      `json:"discovery_visible" bson:"discovery_visible"`
	CreatedAt        time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" bson:"updated_at"`
}

// DiscoverTrainer is a public-safe projection for client swipe discovery.
type DiscoverTrainer struct {
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	ImageURL     string  `json:"image_url,omitempty"`
	Headline     string  `json:"headline,omitempty"`
	Bio          string  `json:"bio,omitempty"`
	Speciality   string  `json:"speciality,omitempty"`
	Experience   int     `json:"experience"`
	HourlyRate   float64 `json:"hourly_rate"`
	TrainerType  string  `json:"trainer_type,omitempty"`
	City         string  `json:"city,omitempty"`
	Area         string  `json:"area,omitempty"`
	Latitude     float64 `json:"latitude,omitempty"`
	Longitude    float64 `json:"longitude,omitempty"`
	DistanceKm   float64 `json:"distance_km"`
	Rating       float64 `json:"rating"`
	RatingCount  int     `json:"rating_count"`
}
