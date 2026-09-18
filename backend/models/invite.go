package models

import "time"

// Invite links a client Google account to an existing trainee record.
type Invite struct {
	ID        string     `bson:"_id,omitempty" json:"id"`
	Code      string     `bson:"code" json:"code"`
	TraineeID string     `bson:"trainee_id" json:"trainee_id"`
	TrainerID string     `bson:"trainer_id" json:"trainer_id"` // trainer email
	ExpiresAt time.Time  `bson:"expires_at" json:"expires_at"`
	UsedAt    *time.Time `bson:"used_at,omitempty" json:"used_at,omitempty"`
	UsedBy    string     `bson:"used_by,omitempty" json:"used_by,omitempty"` // user id
	CreatedAt time.Time  `bson:"created_at" json:"created_at"`
}
