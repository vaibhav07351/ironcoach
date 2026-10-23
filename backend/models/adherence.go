package models

// AdherenceSummary is the weekly adherence view for a trainee.
type AdherenceSummary struct {
	TraineeID       string  `json:"trainee_id"`
	TraineeName     string  `json:"trainee_name,omitempty"`
	WeekStart       string  `json:"week_start"` // YYYY-MM-DD in the user's zone
	WorkoutDays     int     `json:"workout_days"`
	DietDays        int     `json:"diet_days"`
	ExpectedDays    int     `json:"expected_days"`
	Score           float64 `json:"score"` // 0–100
	StreakDays      int     `json:"streak_days"`
	AtRisk          bool    `json:"at_risk"`
	MissedYesterday bool    `json:"missed_yesterday"`
	// LastActivityDate is the latest day with a workout or diet log in the activity window
	// (empty when there is none). TrainedToday means a workout was logged today.
	LastActivityDate string `json:"last_activity_date,omitempty"`
	TrainedToday     bool   `json:"trained_today"`
}
