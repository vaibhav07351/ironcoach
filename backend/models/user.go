package models

import "time"

const (
	RoleTrainer = "trainer"
	RoleClient  = "client"
)

// User is the auth identity linked to Google SSO.
type User struct {
	ID        string `bson:"_id,omitempty" json:"id"`
	GoogleSub string `bson:"google_sub" json:"google_sub"`
	Email     string `bson:"email" json:"email"`
	Name      string `bson:"name" json:"name"`
	Picture   string `bson:"picture,omitempty" json:"picture,omitempty"`
	Role      string `bson:"role" json:"role"` // trainer | client
	// TrainerID is the coach's user id: the trainer's own id for trainers, their coach's id for clients.
	TrainerID string   `bson:"trainer_id,omitempty" json:"trainer_id,omitempty"`
	TraineeID string   `bson:"trainee_id,omitempty" json:"trainee_id,omitempty"`
	Interests []string `bson:"interests,omitempty" json:"interests,omitempty"`
	// Timezone is an IANA zone name (e.g. Asia/Kolkata) used for "today", weeks and streaks.
	Timezone string `bson:"timezone,omitempty" json:"timezone,omitempty"`
	// OnboardingDone is nil for legacy accounts (treated as done). New trainers get false until they pick categories.
	OnboardingDone *bool `bson:"onboarding_done,omitempty" json:"-"`
	// TermsAcceptedAt records when the user confirmed they are 18+ and accepted the terms.
	TermsAcceptedAt *time.Time `bson:"terms_accepted_at,omitempty" json:"-"`
	// ShareConsentAt records when a client agreed to share their logs with a coach.
	ShareConsentAt *time.Time `bson:"share_consent_at,omitempty" json:"-"`
	CreatedAt      time.Time  `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `bson:"updated_at" json:"updated_at"`
}

// PublicUser is a safe API projection (no internal-only fields beyond role links).
type PublicUser struct {
	ID              string   `json:"id"`
	Email           string   `json:"email"`
	Name            string   `json:"name"`
	Picture         string   `json:"picture,omitempty"`
	Role            string   `json:"role"`
	TrainerID       string   `json:"trainer_id,omitempty"`
	TraineeID       string   `json:"trainee_id,omitempty"`
	Interests       []string `json:"interests,omitempty"`
	Timezone        string   `json:"timezone"`
	NeedsOnboarding bool     `json:"needs_onboarding"`
	NeedsInvite     bool     `json:"needs_invite"`
	NeedsInterests  bool     `json:"needs_interests"`
}
