package models

import "time"

const (
	CoachRequestPending  = "pending"
	CoachRequestAccepted = "accepted"
	CoachRequestRejected = "rejected"
	// CoachRequestCancelled marks a request withdrawn by the client or closed because the
	// client linked with another coach.
	CoachRequestCancelled = "cancelled"
)

type CoachRequest struct {
	ID           string `bson:"_id,omitempty" json:"id"`
	ClientUserID string `bson:"client_user_id" json:"client_user_id"`
	ClientName   string `bson:"client_name,omitempty" json:"client_name,omitempty"`
	ClientEmail  string `bson:"client_email,omitempty" json:"client_email,omitempty"`
	// TrainerID is the trainer's user id; TrainerName is shown in the client's request list.
	TrainerID   string     `bson:"trainer_id" json:"trainer_id"`
	TrainerName string     `bson:"trainer_name,omitempty" json:"trainer_name,omitempty"`
	Status      string     `bson:"status" json:"status"` // pending | accepted | rejected | cancelled
	CreatedAt   time.Time  `bson:"created_at" json:"created_at"`
	ResolvedAt  *time.Time `bson:"resolved_at,omitempty" json:"resolved_at,omitempty"`
}
