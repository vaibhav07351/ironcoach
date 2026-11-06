package models

// ExerciseSession is one day of one exercise: every set logged for it that day (merged across
// documents when an old log and a new one share a date).
type ExerciseSession struct {
	Date    string     `json:"date"`
	LogID   string     `json:"log_id,omitempty"`
	Entries []SetEntry `json:"entries"`
	Notes   string     `json:"notes,omitempty"`
}

// ExerciseDay is what the Track tab needs in one call: today's sets, the previous session for
// pre-filling, and which of today's sets are personal records.
type ExerciseDay struct {
	Exercise Exercise         `json:"exercise"`
	Log      *WorkoutLog      `json:"log"`
	Previous *ExerciseSession `json:"previous"`
	PRFlags  []bool           `json:"pr_flags"`
}

// ExerciseDaySaved is returned after saving an exercise's sets for a day.
type ExerciseDaySaved struct {
	Log     *WorkoutLog `json:"log"`
	PRFlags []bool      `json:"pr_flags"`
	// NewPR is true when at least one set is a personal record.
	NewPR bool `json:"new_pr"`
}

// StatPoint is one day's value of a metric.
type StatPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// RepRecord is the heaviest weight lifted for an exact rep count.
type RepRecord struct {
	Reps     int     `json:"reps"`
	WeightKg float64 `json:"weight_kg"`
	Date     string  `json:"date"`
}

// ExerciseBests are the all-time bests of one exercise. Fields irrelevant to the exercise type
// stay zero.
type ExerciseBests struct {
	E1RM         float64 `json:"e1rm"`
	E1RMDate     string  `json:"e1rm_date,omitempty"`
	MaxWeight    float64 `json:"max_weight"`
	MaxReps      int     `json:"max_reps"`
	MaxVolume    float64 `json:"max_volume"`
	MaxDistanceM float64 `json:"max_distance_m"`
	MaxDurationS int     `json:"max_duration_s"`
	// BestPaceSPerKm is the fastest pace (lowest seconds per km) of a set with distance and time.
	BestPaceSPerKm float64 `json:"best_pace_s_per_km"`
	Sessions       int     `json:"sessions"`
}

// ExerciseStats feeds the Graph tab: one series per metric for the range, plus all-time bests and
// the rep-max table.
type ExerciseStats struct {
	ExerciseType string                 `json:"exercise_type"`
	Range        string                 `json:"range"`
	Series       map[string][]StatPoint `json:"series"`
	Bests        ExerciseBests          `json:"bests"`
	RepRecords   []RepRecord            `json:"rep_records"`
}

// ActivityCount is how many days an activity was logged in a window.
type ActivityCount struct {
	ActivityType string `json:"activity_type"`
	Days         int    `json:"days"`
}

// PREvent is a personal record set on a day (used by progress summaries and the trainer's Wins).
type PREvent struct {
	TraineeID   string  `json:"trainee_id"`
	TraineeName string  `json:"trainee_name,omitempty"`
	Date        string  `json:"date"`
	Exercise    string  `json:"exercise"`
	ExerciseID  string  `json:"exercise_id"`
	Kind        string  `json:"kind"` // "e1rm", "distance", "duration", "reps"
	Value       float64 `json:"value"`
	Previous    float64 `json:"previous"`
}
