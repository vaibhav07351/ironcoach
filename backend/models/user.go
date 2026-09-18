package models

import "time"

const (
	RoleTrainer = "trainer"
	RoleClient  = "client"
)

// User is the auth identity linked to Google SSO.
type User struct {
	ID        string    `bson:"_id,omitempty" json:"id"`
	GoogleSub string    `bson:"google_sub" json:"google_sub"`
	Email     string    `bson:"email" json:"email"`
	Name      string    `bson:"name" json:"name"`
	Picture   string    `bson:"picture,omitempty" json:"picture,omitempty"`
	Role      string    `bson:"role" json:"role"` // trainer | client
	TrainerID string    `bson:"trainer_id,omitempty" json:"trainer_id,omitempty"` // email key used by existing CRM
	TraineeID string    `bson:"trainee_id,omitempty" json:"trainee_id,omitempty"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
}

// PublicUser is a safe API projection (no internal-only fields beyond role links).
type PublicUser struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Name            string `json:"name"`
	Picture         string `json:"picture,omitempty"`
	Role            string `json:"role"`
	TrainerID       string `json:"trainer_id,omitempty"`
	TraineeID       string `json:"trainee_id,omitempty"`
	NeedsOnboarding bool   `json:"needs_onboarding"`
	NeedsInvite     bool   `json:"needs_invite"`
}
