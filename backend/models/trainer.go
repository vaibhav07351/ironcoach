package models

import "time"

// Trainer is a coach's profile. UserID (the trainer's users._id) is the stable identity used by
// every other record; Email is contact information only.
type Trainer struct {
	UserID         string   `json:"id" bson:"user_id,omitempty"`
	Name           string   `json:"name" bson:"name"`
	Email          string   `json:"email" bson:"email"`
	ImageURL       string   `json:"image_url,omitempty" bson:"image_url,omitempty"`
	PhoneNumber    string   `json:"phone_number" bson:"phone_number"`
	Address        string   `json:"address" bson:"address"`
	Speciality     string   `json:"speciality" bson:"speciality"`
	Expertises     []string `json:"expertises" bson:"expertises"`
	DateOfBirth    string   `json:"date_of_birth" bson:"date_of_birth"`
	Gender         string   `json:"gender" bson:"gender"`
	Experience     int      `json:"experience" bson:"experience"`
	Certifications []string `json:"certifications" bson:"certifications"`
	HourlyRate     float64  `json:"hourly_rate" bson:"hourly_rate"`
	Bio            string   `json:"bio" bson:"bio"`
	SocialHandle   string   `json:"social_handle,omitempty" bson:"social_handle,omitempty"`
	Availability   string   `json:"availability" bson:"availability"`
	// UPIID is the trainer's UPI address (e.g. name@bank), used only to build payment reminders.
	UPIID            string    `json:"upi_id,omitempty" bson:"upi_id,omitempty"`
	Rating           float64   `json:"rating" bson:"rating"`
	RatingCount      int       `json:"rating_count" bson:"rating_count"`
	TrainerType      string    `json:"trainer_type" bson:"trainer_type"`
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

// TrainerTypes are the accepted trainer_type values.
var TrainerTypes = map[string]bool{"personal": true, "group": true, "online": true, "rehabilitation": true}

// TrainerProfileUpdate is the accepted body for a trainer editing their profile. Only provided
// fields change; identity, rating and timestamps are server-owned.
type TrainerProfileUpdate struct {
	Name             *string   `json:"name"`
	Headline         *string   `json:"headline"`
	Bio              *string   `json:"bio"`
	Speciality       *string   `json:"speciality"`
	Expertises       *[]string `json:"expertises"`
	City             *string   `json:"city"`
	Area             *string   `json:"area"`
	Pincode          *string   `json:"pincode"`
	Latitude         *float64  `json:"latitude"`
	Longitude        *float64  `json:"longitude"`
	HourlyRate       *float64  `json:"hourly_rate"`
	ImageURL         *string   `json:"image_url"`
	Experience       *int      `json:"experience"`
	TrainerType      *string   `json:"trainer_type"`
	DiscoveryVisible *bool     `json:"discovery_visible"`
	PhoneNumber      *string   `json:"phone_number"`
	Address          *string   `json:"address"`
	Availability     *string   `json:"availability"`
	SocialHandle     *string   `json:"social_handle"`
	UPIID            *string   `json:"upi_id"`
}

// DiscoverTrainer is the public projection shown to clients browsing coaches. It never includes
// email, phone or exact location: coordinates are rounded to about 1 km.
type DiscoverTrainer struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	ImageURL    string   `json:"image_url,omitempty"`
	Headline    string   `json:"headline,omitempty"`
	Bio         string   `json:"bio,omitempty"`
	Speciality  string   `json:"speciality,omitempty"`
	Expertises  []string `json:"expertises"`
	Experience  int      `json:"experience"`
	HourlyRate  float64  `json:"hourly_rate"`
	TrainerType string   `json:"trainer_type,omitempty"`
	City        string   `json:"city,omitempty"`
	Area        string   `json:"area,omitempty"`
	Latitude    float64  `json:"latitude,omitempty"`
	Longitude   float64  `json:"longitude,omitempty"`
	DistanceKm  float64  `json:"distance_km"`
	Rating      float64  `json:"rating"`
	RatingCount int      `json:"rating_count"`
	MatchTier   string   `json:"match_tier"` // match | nearby
}
