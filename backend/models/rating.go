package models

import "time"

const (
	RatingToTrainer = "trainer"
	RatingToClient  = "client"
)

// Rating is a single score from one user to a linked trainer or client.
type Rating struct {
	ID         string    `bson:"_id,omitempty" json:"id"`
	FromUserID string    `bson:"from_user_id" json:"from_user_id"`
	FromRole   string    `bson:"from_role" json:"from_role"` // client | trainer
	ToKind     string    `bson:"to_kind" json:"to_kind"`     // trainer | client
	ToID       string    `bson:"to_id" json:"to_id"`         // trainer email or trainee id
	Score      float64   `bson:"score" json:"score"`         // 0.5–5.0 half steps
	CreatedAt  time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt  time.Time `bson:"updated_at" json:"updated_at"`
}
