package services

import (
	"ironcoach/models"
	"math"
	"sort"
)

// Pure functions behind the exercise History / Graph tabs, PR flags and progress summaries.
// Nothing here touches the database, so all of it is unit tested directly.

// Series keys per exercise type (the app picks labels for them).
const (
	SeriesE1RM          = "e1rm"
	SeriesMaxWeight     = "max_weight"
	SeriesMaxReps       = "max_reps"
	SeriesMaxVolume     = "max_volume"
	SeriesWorkoutVolume = "workout_volume"
	SeriesWorkoutReps   = "workout_reps"
	SeriesDistance      = "distance_m"
	SeriesDuration      = "duration_s"
	SeriesPace          = "pace_s_per_km"
	SeriesSpeed         = "speed_kmh"
	SeriesMaxDuration   = "max_duration_s"
)

// PR kinds.
const (
	PRKindE1RM     = "e1rm"
	PRKindReps     = "reps"
	PRKindDistance = "distance"
	PRKindDuration = "duration"
	PRKindPace     = "pace"
	PRKindRepMax   = "rep_max"
)

// maxRepRecord is the highest rep count shown in the rep-max table.
const maxRepRecord = 15

// minPaceDistanceM ignores very short bouts for pace records (a 50 m sprint is not a run PR).
const minPaceDistanceM = 400

// rangeDays maps a Graph range to days back from today; "all" has no bound.
var rangeDays = map[string]int{"1m": 30, "3m": 91, "6m": 182, "1y": 365}

// IsValidStatsRange reports whether r is a supported Graph range.
func IsValidStatsRange(r string) bool {
	_, ok := rangeDays[r]
	return ok || r == "all"
}

// estimatedOneRM uses the Epley formula, weight x (1 + reps / 30); a single rep is the weight
// itself. Zero for sets without weight or reps.
func estimatedOneRM(weightKg float64, reps int) float64 {
	if weightKg <= 0 || reps <= 0 {
		return 0
	}
	if reps == 1 {
		return weightKg
	}
	return round1(weightKg * (1 + float64(reps)/30))
}

// paceSPerKm is seconds per km, or 0 when distance or time is missing.
func paceSPerKm(distanceM float64, durationS int) float64 {
	if distanceM <= 0 || durationS <= 0 {
		return 0
	}
	return math.Round(float64(durationS) / (distanceM / 1000))
}

func round1(v float64) float64 { return math.Round(v*10) / 10 }

// sessionsForExercise extracts one exercise's sets from logs and merges logs that share a date,
// oldest first. Logs may hold other exercises (old multi-exercise logs); those are ignored.
func sessionsForExercise(logs []models.WorkoutLog, exerciseID string) []models.ExerciseSession {
	byDate := map[string]*models.ExerciseSession{}
	for _, log := range logs {
		for _, w := range log.Workouts {
			if w.ExerciseID.Hex() != exerciseID {
				continue
			}
			entries := models.EntriesOf(w)
			if len(entries) == 0 {
				continue
			}
			s, ok := byDate[log.Date]
			if !ok {
				s = &models.ExerciseSession{Date: log.Date, LogID: log.ID}
				byDate[log.Date] = s
			}
			// Prefer the keyed (new-style) log as the session's editable log.
			if log.ExerciseKey != "" {
				s.LogID = log.ID
			}
			s.Entries = append(s.Entries, entries...)
			if log.Notes != "" && s.Notes == "" {
				s.Notes = log.Notes
			}
		}
	}
	out := make([]models.ExerciseSession, 0, len(byDate))
	for _, s := range byDate {
		out = append(out, *s)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Date < out[j].Date })
	return out
}

// computeBests folds sessions into all-time bests and the rep-max table.
func computeBests(sessions []models.ExerciseSession) (models.ExerciseBests, []models.RepRecord) {
	var b models.ExerciseBests
	repMax := map[int]models.RepRecord{}
	for _, s := range sessions {
		b.Sessions++
		for _, e := range s.Entries {
			if v := estimatedOneRM(e.WeightKg, e.Reps); v > b.E1RM {
				b.E1RM, b.E1RMDate = v, s.Date
			}
			if e.WeightKg > b.MaxWeight {
				b.MaxWeight = e.WeightKg
			}
			if e.Reps > b.MaxReps {
				b.MaxReps = e.Reps
			}
			if v := e.WeightKg * float64(e.Reps); v > b.MaxVolume {
				b.MaxVolume = v
			}
			if e.DistanceM > b.MaxDistanceM {
				b.MaxDistanceM = e.DistanceM
			}
			if e.DurationS > b.MaxDurationS {
				b.MaxDurationS = e.DurationS
			}
			if e.DistanceM >= minPaceDistanceM {
				if p := paceSPerKm(e.DistanceM, e.DurationS); p > 0 && (b.BestPaceSPerKm == 0 || p < b.BestPaceSPerKm) {
					b.BestPaceSPerKm = p
				}
			}
			if e.Reps >= 1 && e.Reps <= maxRepRecord && e.WeightKg > 0 {
				if cur, ok := repMax[e.Reps]; !ok || e.WeightKg > cur.WeightKg {
					repMax[e.Reps] = models.RepRecord{Reps: e.Reps, WeightKg: e.WeightKg, Date: s.Date}
				}
			}
		}
	}
	records := make([]models.RepRecord, 0, len(repMax))
	for _, r := range repMax {
		records = append(records, r)
	}
	sort.Slice(records, func(i, j int) bool { return records[i].Reps < records[j].Reps })
	return b, records
}

// sessionPoint computes one session's value for every series of the exercise type.
func sessionPoint(exerciseType string, s models.ExerciseSession) map[string]float64 {
	var e1rm, maxW, maxVol, vol, distance float64
	var maxReps, reps, duration, maxDuration, pacedDuration int
	var pacedDistance float64
	for _, e := range s.Entries {
		e1rm = math.Max(e1rm, estimatedOneRM(e.WeightKg, e.Reps))
		maxW = math.Max(maxW, e.WeightKg)
		v := e.WeightKg * float64(e.Reps)
		maxVol = math.Max(maxVol, v)
		vol += v
		reps += e.Reps
		if e.Reps > maxReps {
			maxReps = e.Reps
		}
		distance += e.DistanceM
		duration += e.DurationS
		if e.DurationS > maxDuration {
			maxDuration = e.DurationS
		}
		if e.DistanceM > 0 && e.DurationS > 0 {
			pacedDistance += e.DistanceM
			pacedDuration += e.DurationS
		}
	}
	switch exerciseType {
	case models.ExerciseDistanceTime:
		out := map[string]float64{SeriesDistance: distance, SeriesDuration: float64(duration)}
		if p := paceSPerKm(pacedDistance, pacedDuration); p > 0 {
			out[SeriesPace] = p
			out[SeriesSpeed] = round1((pacedDistance / 1000) / (float64(pacedDuration) / 3600))
		}
		return out
	case models.ExerciseTime:
		return map[string]float64{SeriesMaxDuration: float64(maxDuration), SeriesDuration: float64(duration)}
	case models.ExerciseReps:
		out := map[string]float64{SeriesMaxReps: float64(maxReps), SeriesWorkoutReps: float64(reps)}
		if maxW > 0 {
			out[SeriesMaxWeight] = maxW
		}
		return out
	default:
		return map[string]float64{
			SeriesE1RM: e1rm, SeriesMaxWeight: maxW, SeriesMaxReps: float64(maxReps),
			SeriesMaxVolume: round1(maxVol), SeriesWorkoutVolume: round1(vol), SeriesWorkoutReps: float64(reps),
		}
	}
}

// buildExerciseStats turns oldest-first sessions into the Graph response. Series cover sessions
// on or after fromDate ("" = all); bests and rep records are all-time.
func buildExerciseStats(exerciseType, rangeKey, fromDate string, sessions []models.ExerciseSession) models.ExerciseStats {
	series := map[string][]models.StatPoint{}
	for _, s := range sessions {
		if fromDate != "" && s.Date < fromDate {
			continue
		}
		for key, v := range sessionPoint(exerciseType, s) {
			if v > 0 {
				series[key] = append(series[key], models.StatPoint{Date: s.Date, Value: v})
			}
		}
	}
	bests, records := computeBests(sessions)
	if exerciseType != models.ExerciseWeightReps {
		records = []models.RepRecord{}
	}
	return models.ExerciseStats{ExerciseType: exerciseType, Range: rangeKey, Series: series, Bests: bests, RepRecords: records}
}

// prFlags marks which of a day's sets are personal records against the bests of earlier days.
// With no earlier session nothing is a record (the first workout has nothing to beat), and per
// kind only the day's top set is flagged, so one great set is one trophy.
func prFlags(exerciseType string, entries []models.SetEntry, prior models.ExerciseBests, priorRepMax []models.RepRecord) []bool {
	flags := make([]bool, len(entries))
	if prior.Sessions == 0 || len(entries) == 0 {
		return flags
	}
	flagTop := func(score func(models.SetEntry) float64, beats func(float64) bool) {
		best, idx := 0.0, -1
		for i, e := range entries {
			if v := score(e); v > best {
				best, idx = v, i
			}
		}
		if idx >= 0 && beats(best) {
			flags[idx] = true
		}
	}

	switch exerciseType {
	case models.ExerciseDistanceTime:
		flagTop(func(e models.SetEntry) float64 { return e.DistanceM }, func(v float64) bool { return v > prior.MaxDistanceM })
		flagTop(func(e models.SetEntry) float64 { return float64(e.DurationS) }, func(v float64) bool { return v > float64(prior.MaxDurationS) })
		// Pace: lower is better, so score by speed.
		flagTop(func(e models.SetEntry) float64 {
			if e.DistanceM < minPaceDistanceM {
				return 0
			}
			if p := paceSPerKm(e.DistanceM, e.DurationS); p > 0 {
				return 1 / p
			}
			return 0
		}, func(v float64) bool { return prior.BestPaceSPerKm > 0 && 1/v < prior.BestPaceSPerKm })
	case models.ExerciseTime:
		flagTop(func(e models.SetEntry) float64 { return float64(e.DurationS) }, func(v float64) bool { return v > float64(prior.MaxDurationS) })
	case models.ExerciseReps:
		flagTop(func(e models.SetEntry) float64 { return float64(e.Reps) }, func(v float64) bool { return v > float64(prior.MaxReps) })
	default:
		flagTop(func(e models.SetEntry) float64 { return estimatedOneRM(e.WeightKg, e.Reps) }, func(v float64) bool { return v > prior.E1RM })
		// Heaviest weight for an exact rep count, only where an earlier record exists for it.
		priorByReps := make(map[int]float64, len(priorRepMax))
		for _, r := range priorRepMax {
			priorByReps[r.Reps] = r.WeightKg
		}
		topByReps := map[int]int{}
		for i, e := range entries {
			if j, ok := topByReps[e.Reps]; !ok || e.WeightKg > entries[j].WeightKg {
				topByReps[e.Reps] = i
			}
		}
		for reps, i := range topByReps {
			if prev, ok := priorByReps[reps]; ok && entries[i].WeightKg > prev {
				flags[i] = true
			}
		}
	}
	return flags
}

// anyTrue reports whether any flag is set.
func anyTrue(flags []bool) bool {
	for _, f := range flags {
		if f {
			return true
		}
	}
	return false
}

// sessionScore is the single number a session's PR is judged on for its type.
func sessionScore(exerciseType string, s models.ExerciseSession) (kind string, value float64) {
	p := sessionPoint(exerciseType, s)
	switch exerciseType {
	case models.ExerciseDistanceTime:
		var maxDist float64
		for _, e := range s.Entries {
			maxDist = math.Max(maxDist, e.DistanceM)
		}
		return PRKindDistance, maxDist
	case models.ExerciseTime:
		return PRKindDuration, p[SeriesMaxDuration]
	case models.ExerciseReps:
		return PRKindReps, p[SeriesMaxReps]
	default:
		return PRKindE1RM, p[SeriesE1RM]
	}
}

// exerciseTrack is one exercise's sessions (oldest first) for PR event detection.
type exerciseTrack struct {
	TraineeID  string
	ExerciseID string
	Name       string
	Type       string
	Sessions   []models.ExerciseSession
}

// prEvents walks each exercise chronologically and reports the days that beat every earlier
// day (the first session never counts). Only days on or after since are returned.
func prEvents(tracks []exerciseTrack, since string) []models.PREvent {
	var out []models.PREvent
	for _, t := range tracks {
		best := 0.0
		for i, s := range t.Sessions {
			kind, v := sessionScore(t.Type, s)
			if i > 0 && v > best && best > 0 && s.Date >= since {
				out = append(out, models.PREvent{
					TraineeID: t.TraineeID, Date: s.Date, Exercise: t.Name, ExerciseID: t.ExerciseID,
					Kind: kind, Value: v, Previous: best,
				})
			}
			if v > best {
				best = v
			}
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Date > out[j].Date })
	return out
}

// tracksFromLogs groups logs into one track per (trainee, exercise). Exercises are keyed by id;
// very old entries without an id fall back to their name. typeOf supplies each exercise's type
// (missing ids default to weight x reps, or the type stored on the entry).
func tracksFromLogs(logs []models.WorkoutLog, typeOf map[string]string) []exerciseTrack {
	type key struct{ trainee, exercise string }
	byKey := map[key]*exerciseTrack{}
	sessions := map[key]map[string]*models.ExerciseSession{}
	var order []key
	for _, log := range logs {
		for _, w := range log.Workouts {
			entries := models.EntriesOf(w)
			if len(entries) == 0 {
				continue
			}
			id := w.ExerciseID.Hex()
			if w.ExerciseID.IsZero() {
				id = "name:" + w.Exercise
			}
			k := key{log.TraineeID, id}
			t, ok := byKey[k]
			if !ok {
				typ := typeOf[id]
				if typ == "" {
					typ = models.NormalizeExerciseType(w.Type)
				}
				t = &exerciseTrack{TraineeID: log.TraineeID, ExerciseID: id, Name: w.Exercise, Type: typ}
				byKey[k] = t
				sessions[k] = map[string]*models.ExerciseSession{}
				order = append(order, k)
			}
			s, ok := sessions[k][log.Date]
			if !ok {
				s = &models.ExerciseSession{Date: log.Date}
				sessions[k][log.Date] = s
			}
			s.Entries = append(s.Entries, entries...)
		}
	}
	out := make([]exerciseTrack, 0, len(order))
	for _, k := range order {
		t := byKey[k]
		for _, s := range sessions[k] {
			t.Sessions = append(t.Sessions, *s)
		}
		sort.Slice(t.Sessions, func(i, j int) bool { return t.Sessions[i].Date < t.Sessions[j].Date })
		out = append(out, *t)
	}
	return out
}
