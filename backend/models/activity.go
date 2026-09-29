package models

// Activity type codes for session logging (aligned with expertise where possible).
const (
	ActivityGym       = "gym"
	ActivitySwimming  = "swimming"
	ActivityBadminton = "badminton"
	ActivityYoga      = "yoga"
	ActivityRunning   = "running"
	ActivityCricket   = "cricket"
	ActivityBoxing    = "boxing"
	ActivityMMA       = "mma"
	ActivityOther     = "other"
)

// AllActivityTypes is the ordered launch set.
var AllActivityTypes = []string{
	ActivityGym,
	ActivitySwimming,
	ActivityBadminton,
	ActivityYoga,
	ActivityRunning,
	ActivityCricket,
	ActivityBoxing,
	ActivityMMA,
	ActivityOther,
}

var activitySet = func() map[string]struct{} {
	m := make(map[string]struct{}, len(AllActivityTypes))
	for _, a := range AllActivityTypes {
		m[a] = struct{}{}
	}
	return m
}()

// IsValidActivityType reports whether code is a known activity type.
func IsValidActivityType(code string) bool {
	_, ok := activitySet[code]
	return ok
}

// SessionMetrics holds sport-specific fields (only relevant keys used per type).
type SessionMetrics struct {
	DurationMin float64 `json:"duration_min,omitempty" bson:"duration_min,omitempty"`
	DistanceM   float64 `json:"distance_m,omitempty" bson:"distance_m,omitempty"`
	DistanceKm  float64 `json:"distance_km,omitempty" bson:"distance_km,omitempty"`
	Laps        int     `json:"laps,omitempty" bson:"laps,omitempty"`
	Stroke      string  `json:"stroke,omitempty" bson:"stroke,omitempty"`
	Intensity   string  `json:"intensity,omitempty" bson:"intensity,omitempty"`
	Style       string  `json:"style,omitempty" bson:"style,omitempty"`
	GamesWon    int     `json:"games_won,omitempty" bson:"games_won,omitempty"`
	GamesLost   int     `json:"games_lost,omitempty" bson:"games_lost,omitempty"`
	Rounds      int     `json:"rounds,omitempty" bson:"rounds,omitempty"`
	SessionKind string  `json:"session_kind,omitempty" bson:"session_kind,omitempty"`
	Title       string  `json:"title,omitempty" bson:"title,omitempty"`
	RoleNote    string  `json:"role_note,omitempty" bson:"role_note,omitempty"`
}
