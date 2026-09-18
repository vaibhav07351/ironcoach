package models

import "time"

const (
	CoachRequestPending  = "pending"
	CoachRequestAccepted = "accepted"
	CoachRequestRejected = "rejected"
)

type CoachRequest struct {
	ID           string     `bson:"_id,omitempty" json:"id"`
	ClientUserID string     `bson:"client_user_id" json:"client_user_id"`
	ClientName   string     `bson:"client_name,omitempty" json:"client_name,omitempty"`
	ClientEmail  string     `bson:"client_email,omitempty" json:"client_email,omitempty"`
	TrainerEmail string     `bson:"trainer_email" json:"trainer_email"`
	Status       string     `bson:"status" json:"status"` // pending | accepted | rejected
	CreatedAt    time.Time  `bson:"created_at" json:"created_at"`
	ResolvedAt   *time.Time `bson:"resolved_at,omitempty" json:"resolved_at,omitempty"`
}
