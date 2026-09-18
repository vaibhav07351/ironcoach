package models

// AdherenceSummary is the weekly adherence view for a trainee.
type AdherenceSummary struct {
	TraineeID       string  `json:"trainee_id"`
	TraineeName     string  `json:"trainee_name,omitempty"`
	WeekStart       string  `json:"week_start"` // YYYY-MM-DD UTC
	WorkoutDays     int     `json:"workout_days"`
	DietDays        int     `json:"diet_days"`
	ExpectedDays    int     `json:"expected_days"`
	Score           float64 `json:"score"` // 0–100
	StreakDays      int     `json:"streak_days"`
	AtRisk          bool    `json:"at_risk"`
	MissedYesterday bool    `json:"missed_yesterday"`
}
