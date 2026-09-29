package models

// Expertise codes for trainer–client matching. Add new sports here only.
const (
	ExpertiseGym       = "gym"
	ExpertiseSwimming  = "swimming"
	ExpertiseBadminton = "badminton"
	ExpertiseYoga      = "yoga"
	ExpertiseRunning   = "running"
	ExpertiseCricket   = "cricket"
	ExpertiseBoxing    = "boxing"
	ExpertiseMMA       = "mma"
	ExpertiseOther     = "other"
)

// AllExpertises is the ordered launch set (extensible).
var AllExpertises = []string{
	ExpertiseGym,
	ExpertiseSwimming,
	ExpertiseBadminton,
	ExpertiseYoga,
	ExpertiseRunning,
	ExpertiseCricket,
	ExpertiseBoxing,
	ExpertiseMMA,
	ExpertiseOther,
}

var expertiseSet = func() map[string]struct{} {
	m := make(map[string]struct{}, len(AllExpertises))
	for _, e := range AllExpertises {
		m[e] = struct{}{}
	}
	return m
}()

// IsValidExpertise reports whether code is a known expertise.
func IsValidExpertise(code string) bool {
	_, ok := expertiseSet[code]
	return ok
}

// NormalizeExpertises validates, dedupes, and returns clean codes.
// Empty input returns {"other"} so legacy profiles stay discoverable.
func NormalizeExpertises(codes []string) ([]string, bool) {
	if len(codes) == 0 {
		return []string{ExpertiseOther}, true
	}
	seen := make(map[string]struct{}, len(codes))
	out := make([]string, 0, len(codes))
	for _, c := range codes {
		if !IsValidExpertise(c) {
			return nil, false
		}
		if _, ok := seen[c]; ok {
			continue
		}
		seen[c] = struct{}{}
		out = append(out, c)
	}
	if len(out) == 0 {
		return []string{ExpertiseOther}, true
	}
	return out, true
}

// ExpertiseOverlap returns true when a and b share any code,
// or when either side includes "other" (open matching).
func ExpertiseOverlap(a, b []string) bool {
	if len(a) == 0 || len(b) == 0 {
		return true
	}
	setB := make(map[string]struct{}, len(b))
	for _, x := range b {
		setB[x] = struct{}{}
		if x == ExpertiseOther {
			return true
		}
	}
	for _, x := range a {
		if x == ExpertiseOther {
			return true
		}
		if _, ok := setB[x]; ok {
			return true
		}
	}
	return false
}

// EffectiveExpertises returns trainer expertises, defaulting empty to other.
func EffectiveExpertises(codes []string) []string {
	if len(codes) == 0 {
		return []string{ExpertiseOther}
	}
	return codes
}
