package models

// MonthStats is one calendar month of training.
type MonthStats struct {
	Month       string  `json:"month"` // YYYY-MM
	WorkoutDays int     `json:"workout_days"`
	VolumeKg    float64 `json:"volume_kg"`
	Sets        int     `json:"sets"`
	PRs         int     `json:"prs"`
}

// ValueChange is a metric's first and latest value.
type ValueChange struct {
	Metric string     `json:"metric"`
	First  DatedValue `json:"first"`
	Latest DatedValue `json:"latest"`
}

// LiftChange is how one exercise moved: its score (e1RM, max reps, distance or time, by type)
// in the first and the latest session, and the best ever.
type LiftChange struct {
	ExerciseID string     `json:"exercise_id"`
	Exercise   string     `json:"exercise"`
	Type       string     `json:"type"`
	Kind       string     `json:"kind"`
	Sessions   int        `json:"sessions"`
	First      DatedValue `json:"first"`
	Latest     DatedValue `json:"latest"`
	Best       DatedValue `json:"best"`
}

// ProgressSummary is the "since joining" and month-on-month view of a client.
type ProgressSummary struct {
	Since            string        `json:"since"`
	WorkoutDaysTotal int           `json:"workout_days_total"`
	ThisMonth        MonthStats    `json:"this_month"`
	LastMonth        MonthStats    `json:"last_month"`
	Bodyweight       *ValueChange  `json:"bodyweight"`
	Measurements     []ValueChange `json:"measurements"`
	Lifts            []LiftChange  `json:"lifts"`
	RecentPRs        []PREvent     `json:"recent_prs"`
}

// CompareRow is one metric or exercise at two dates.
type CompareRow struct {
	Kind  string      `json:"kind"` // "body" or "lift"
	Key   string      `json:"key"`  // metric code or exercise id
	Label string      `json:"label,omitempty"`
	Type  string      `json:"type,omitempty"`  // exercise type (lifts)
	Score string      `json:"score,omitempty"` // PR kind of the lift score
	From  *DatedValue `json:"from"`
	To    *DatedValue `json:"to"`
}

// CompareResult compares a client at two dates.
type CompareResult struct {
	From string       `json:"from"`
	To   string       `json:"to"`
	Rows []CompareRow `json:"rows"`
}
