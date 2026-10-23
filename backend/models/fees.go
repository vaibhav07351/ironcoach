package models

import "time"

// Package kinds.
const (
	PackageKindSessions = "sessions" // N sessions, used up by attended days
	PackageKindMonthly  = "monthly"  // valid from start_date to end_date
)

// Package is something a trainer sold to a client (for example "12 sessions" or "October").
// Amounts are whole paise (1 rupee = 100 paise) so money never passes through floating point.
type Package struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	TraineeID   string    `json:"trainee_id" bson:"trainee_id"`
	Kind        string    `json:"kind" bson:"kind"`
	Name        string    `json:"name" bson:"name"`
	AmountPaise int64     `json:"amount_paise" bson:"amount_paise"`
	Sessions    int       `json:"sessions,omitempty" bson:"sessions,omitempty"`
	StartDate   string    `json:"start_date" bson:"start_date"`
	EndDate     string    `json:"end_date,omitempty" bson:"end_date,omitempty"`
	ClientID    string    `json:"client_id,omitempty" bson:"client_id,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
}

// Payment is money the client handed to the trainer, recorded by the trainer. The app never
// moves money.
type Payment struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	TraineeID   string    `json:"trainee_id" bson:"trainee_id"`
	AmountPaise int64     `json:"amount_paise" bson:"amount_paise"`
	Date        string    `json:"date" bson:"date"`
	Note        string    `json:"note,omitempty" bson:"note,omitempty"`
	ClientID    string    `json:"client_id,omitempty" bson:"client_id,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
}

// Attendance is one attended day for a client (at most one record per client per day).
type Attendance struct {
	ID        string    `bson:"_id,omitempty" json:"id"`
	TraineeID string    `json:"trainee_id" bson:"trainee_id"`
	Date      string    `json:"date" bson:"date"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

// PackageInput is the accepted body for selling a package.
type PackageInput struct {
	Kind        string `json:"kind"`
	Name        string `json:"name"`
	AmountPaise int64  `json:"amount_paise"`
	Sessions    int    `json:"sessions"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
	ClientID    string `json:"client_id"`
}

// PaymentInput is the accepted body for recording a payment.
type PaymentInput struct {
	AmountPaise int64  `json:"amount_paise"`
	Date        string `json:"date"`
	Note        string `json:"note"`
	ClientID    string `json:"client_id"`
}

// PackageView is a package plus what has been used of it.
type PackageView struct {
	Package
	// SessionsUsed and SessionsLeft are set for session packages.
	SessionsUsed int `json:"sessions_used"`
	SessionsLeft int `json:"sessions_left"`
	// Attended counts attended days inside a monthly package's dates.
	Attended int `json:"attended"`
	// Status is active, used_up (sessions) or expired (monthly).
	Status string `json:"status"`
}

// FeeSummary is one client's money position.
type FeeSummary struct {
	TraineeID   string        `json:"trainee_id"`
	TotalPaise  int64         `json:"total_paise"`
	PaidPaise   int64         `json:"paid_paise"`
	DuePaise    int64         `json:"due_paise"`
	CreditPaise int64         `json:"credit_paise"`
	Packages    []PackageView `json:"packages"`
	Payments    []Payment     `json:"payments"`
}

// DueItem is one client with money owed, for the trainer's Today screen.
type DueItem struct {
	TraineeID   string `json:"trainee_id"`
	Name        string `json:"name"`
	PhoneNumber string `json:"phone_number,omitempty"`
	DuePaise    int64  `json:"due_paise"`
}

// TodayClient is a client row on the Today screen.
type TodayClient struct {
	TraineeID string `json:"trainee_id"`
	Name      string `json:"name"`
}

// TodayOverview is everything the trainer's Today screen needs in one call.
type TodayOverview struct {
	Date            string             `json:"date"`
	ClientCount     int                `json:"client_count"`
	TrainedToday    []TodayClient      `json:"trained_today"`
	AttendedToday   []TodayClient      `json:"attended_today"`
	Slipping        []AdherenceSummary `json:"slipping"`
	PendingRequests int64              `json:"pending_requests"`
	Dues            []DueItem          `json:"dues"`
	DuesTotalPaise  int64              `json:"dues_total_paise"`
}
