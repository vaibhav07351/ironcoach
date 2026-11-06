package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	// insightLogCap bounds the logs read for one client's summary (years of daily training).
	insightLogCap = 3000
	// winsLogCap bounds the logs read to find earlier bests for a trainer's recent PRs.
	winsLogCap = 5000
	// recentPRWindowDays is how far back "recent PRs" look on a client's progress page.
	recentPRWindowDays = 30
	maxRecentPRs       = 10
	maxSummaryLifts    = 6
	maxCompareLifts    = 12
	// compareWindowDays: a lift's value "at" a date is its best in the 30 days up to that date.
	compareWindowDays = 30
)

// ProgressInsightsService builds the progress summary, the two-date comparison and the trainer's
// recent wins from logs, weigh-ins and body measurements.
type ProgressInsightsService struct {
	logs      *repositories.WorkoutLogRepository
	exercises *repositories.ExerciseRepository
	progress  *repositories.ProgressRepository
	body      *repositories.BodyMeasurementRepository
	access    *AccessService
}

func NewProgressInsightsService() *ProgressInsightsService {
	return &ProgressInsightsService{
		logs:      repositories.NewWorkoutLogRepository(),
		exercises: repositories.NewExerciseRepository(),
		progress:  repositories.NewProgressRepository(),
		body:      repositories.NewBodyMeasurementRepository(),
		access:    NewAccessService(),
	}
}

// tracksFor loads exercise logs of the trainees (since = "" for all) and groups them per exercise
// with each exercise's real type.
func (s *ProgressInsightsService) tracksFor(logs []models.WorkoutLog) ([]exerciseTrack, error) {
	seen := map[primitive.ObjectID]bool{}
	var ids []primitive.ObjectID
	for _, log := range logs {
		for _, w := range log.Workouts {
			if !w.ExerciseID.IsZero() && !seen[w.ExerciseID] {
				seen[w.ExerciseID] = true
				ids = append(ids, w.ExerciseID)
			}
		}
	}
	types, err := s.exercises.TypesByIDs(ids)
	if err != nil {
		return nil, err
	}
	return tracksFromLogs(logs, types), nil
}

// Summary returns the client's "since joining" and month-on-month progress.
func (s *ProgressInsightsService) Summary(p Principal, traineeID string) (models.ProgressSummary, error) {
	trainee, err := s.access.AuthorizeTrainee(p, traineeID)
	if err != nil {
		return models.ProgressSummary{}, err
	}
	loc := p.Location()
	now := time.Now()
	today := localDate(now, loc)
	thisMonth := today[:7]
	lastMonth := now.In(loc).AddDate(0, 0, -now.In(loc).Day()).Format("2006-01")

	logs, err := s.logs.ExerciseLogsSince([]string{traineeID}, "", insightLogCap)
	if err != nil {
		return models.ProgressSummary{}, err
	}
	tracks, err := s.tracksFor(logs)
	if err != nil {
		return models.ProgressSummary{}, err
	}
	dates, err := s.logs.ActivityDates([]string{traineeID}, "")
	if err != nil {
		return models.ProgressSummary{}, err
	}

	out := models.ProgressSummary{
		Since:            sinceDate(trainee, dates[traineeID], loc),
		WorkoutDaysTotal: len(dates[traineeID]),
		ThisMonth:        models.MonthStats{Month: thisMonth},
		LastMonth:        models.MonthStats{Month: lastMonth},
		Measurements:     []models.ValueChange{},
		Lifts:            []models.LiftChange{},
		RecentPRs:        []models.PREvent{},
	}
	for _, d := range dates[traineeID] {
		switch d[:7] {
		case thisMonth:
			out.ThisMonth.WorkoutDays++
		case lastMonth:
			out.LastMonth.WorkoutDays++
		}
	}
	addVolume(tracks, &out.ThisMonth, &out.LastMonth)
	for _, e := range prEvents(tracks, lastMonth+"-01") {
		switch e.Date[:7] {
		case thisMonth:
			out.ThisMonth.PRs++
		case lastMonth:
			out.LastMonth.PRs++
		}
	}
	recentSince := localDate(now.AddDate(0, 0, -recentPRWindowDays), loc)
	for _, e := range prEvents(tracks, recentSince) {
		if len(out.RecentPRs) >= maxRecentPRs {
			break
		}
		out.RecentPRs = append(out.RecentPRs, e)
	}
	out.Lifts = liftChanges(tracks, maxSummaryLifts)

	if err := s.addBodyChanges(traineeID, &out); err != nil {
		return models.ProgressSummary{}, err
	}
	return out, nil
}

// sinceDate is the coaching start date when set, otherwise the first logged day, otherwise the
// record's creation date.
func sinceDate(t models.Trainee, logDates []string, loc *time.Location) string {
	if t.StartDate != "" && validateDate("start_date", t.StartDate) == nil {
		return t.StartDate
	}
	first := ""
	for _, d := range logDates {
		if first == "" || d < first {
			first = d
		}
	}
	if first != "" {
		return first
	}
	return localDate(t.CreatedAt, loc)
}

// addVolume sums lifted volume and sets per month for weight exercises.
func addVolume(tracks []exerciseTrack, this, last *models.MonthStats) {
	for _, t := range tracks {
		for _, sess := range t.Sessions {
			var target *models.MonthStats
			switch sess.Date[:7] {
			case this.Month:
				target = this
			case last.Month:
				target = last
			default:
				continue
			}
			target.Sets += len(sess.Entries)
			if t.Type == models.ExerciseWeightReps || t.Type == models.ExerciseReps {
				for _, e := range sess.Entries {
					target.VolumeKg += e.WeightKg * float64(e.Reps)
				}
			}
		}
	}
	this.VolumeKg, last.VolumeKg = round1(this.VolumeKg), round1(last.VolumeKg)
}

// liftChanges reports the most-trained exercises (2+ sessions with a score) with their first,
// latest and best score.
func liftChanges(tracks []exerciseTrack, max int) []models.LiftChange {
	out := []models.LiftChange{}
	for _, t := range tracks {
		var scored []models.DatedValue
		kind := ""
		for _, sess := range t.Sessions {
			k, v := sessionScore(t.Type, sess)
			kind = k
			if v > 0 {
				scored = append(scored, models.DatedValue{Date: sess.Date, Value: v})
			}
		}
		if len(scored) < 2 {
			continue
		}
		best := scored[0]
		for _, v := range scored {
			if v.Value > best.Value {
				best = v
			}
		}
		out = append(out, models.LiftChange{
			ExerciseID: t.ExerciseID, Exercise: t.Name, Type: t.Type, Kind: kind, Sessions: len(scored),
			First: scored[0], Latest: scored[len(scored)-1], Best: best,
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Sessions > out[j].Sessions })
	if len(out) > max {
		out = out[:max]
	}
	return out
}

// addBodyChanges fills bodyweight and measurement first/latest values.
func (s *ProgressInsightsService) addBodyChanges(traineeID string, out *models.ProgressSummary) error {
	first, err := s.progress.FirstWeight(traineeID)
	if err != nil {
		return err
	}
	latest, err := s.progress.LatestTwoWeights(traineeID)
	if err != nil {
		return err
	}
	if first != nil && len(latest) > 0 {
		out.Bodyweight = &models.ValueChange{Metric: models.MetricBodyweight, First: *first, Latest: latest[0]}
	}
	measurements, err := s.body.FirstAndLatest(traineeID)
	if err != nil {
		return err
	}
	for _, m := range models.BodyMetrics {
		if v, ok := measurements[m]; ok {
			out.Measurements = append(out.Measurements, models.ValueChange{Metric: m, First: v[0], Latest: v[1]})
		}
	}
	return nil
}

// Compare shows body metrics and lifts at two dates.
func (s *ProgressInsightsService) Compare(p Principal, traineeID, from, to string) (models.CompareResult, error) {
	if err := validateDate("from", from); err != nil {
		return models.CompareResult{}, err
	}
	if err := validateDate("to", to); err != nil {
		return models.CompareResult{}, err
	}
	if from > to {
		from, to = to, from
	}
	if _, err := s.access.AuthorizeTrainee(p, traineeID); err != nil {
		return models.CompareResult{}, err
	}

	out := models.CompareResult{From: from, To: to, Rows: []models.CompareRow{}}
	bodyRows, err := s.compareBody(traineeID, from, to)
	if err != nil {
		return models.CompareResult{}, err
	}
	out.Rows = append(out.Rows, bodyRows...)

	logs, err := s.logs.ExerciseLogsSince([]string{traineeID}, "", insightLogCap)
	if err != nil {
		return models.CompareResult{}, err
	}
	tracks, err := s.tracksFor(logs)
	if err != nil {
		return models.CompareResult{}, err
	}
	out.Rows = append(out.Rows, compareLifts(tracks, from, to, maxCompareLifts)...)
	return out, nil
}

// compareBody returns bodyweight and each measured metric at both dates. A date before the first
// measurement falls back to that first measurement when it is still on or before `to`, so
// "joining vs now" works even if the first tape measure came a week in.
func (s *ProgressInsightsService) compareBody(traineeID, from, to string) ([]models.CompareRow, error) {
	var rows []models.CompareRow

	wFrom, err := s.progress.WeightOnOrBefore(traineeID, from)
	if err != nil {
		return nil, err
	}
	wTo, err := s.progress.WeightOnOrBefore(traineeID, to)
	if err != nil {
		return nil, err
	}
	if wFrom == nil {
		first, err := s.progress.FirstWeight(traineeID)
		if err != nil {
			return nil, err
		}
		if first != nil && first.Date <= to {
			wFrom = first
		}
	}
	if wFrom != nil || wTo != nil {
		rows = append(rows, models.CompareRow{Kind: "body", Key: models.MetricBodyweight, From: wFrom, To: wTo})
	}

	atFrom, err := s.body.ValuesOnOrBefore(traineeID, from)
	if err != nil {
		return nil, err
	}
	atTo, err := s.body.ValuesOnOrBefore(traineeID, to)
	if err != nil {
		return nil, err
	}
	firsts, err := s.body.FirstAndLatest(traineeID)
	if err != nil {
		return nil, err
	}
	for _, m := range models.BodyMetrics {
		row := models.CompareRow{Kind: "body", Key: m}
		if v, ok := atFrom[m]; ok {
			row.From = &v
		} else if fl, ok := firsts[m]; ok && fl[0].Date <= to {
			v := fl[0]
			row.From = &v
		}
		if v, ok := atTo[m]; ok {
			row.To = &v
		}
		if row.From != nil || row.To != nil {
			rows = append(rows, row)
		}
	}
	return rows, nil
}

// compareLifts gives each exercise's best score in the 30 days up to each date. With nothing near
// `from`, the first session (if it is before `to`) stands in, matching compareBody.
func compareLifts(tracks []exerciseTrack, from, to string, max int) []models.CompareRow {
	type scored struct {
		row      models.CompareRow
		sessions int
	}
	var all []scored
	for _, t := range tracks {
		kind := ""
		var first *models.DatedValue
		window := func(end string) *models.DatedValue {
			start := addDaysToDate(end, -compareWindowDays)
			var best *models.DatedValue
			for _, sess := range t.Sessions {
				if sess.Date <= start || sess.Date > end {
					continue
				}
				_, v := sessionScore(t.Type, sess)
				if v > 0 && (best == nil || v > best.Value) {
					best = &models.DatedValue{Date: sess.Date, Value: v}
				}
			}
			return best
		}
		count := 0
		for _, sess := range t.Sessions {
			k, v := sessionScore(t.Type, sess)
			kind = k
			if v > 0 {
				count++
				if first == nil {
					first = &models.DatedValue{Date: sess.Date, Value: v}
				}
			}
		}
		if count == 0 {
			continue
		}
		row := models.CompareRow{Kind: "lift", Key: t.ExerciseID, Label: t.Name, Type: t.Type, Score: kind}
		row.From = window(from)
		if row.From == nil && first != nil && first.Date > from && first.Date <= to {
			row.From = first
		}
		row.To = window(to)
		if row.From == nil && row.To == nil {
			continue
		}
		all = append(all, scored{row: row, sessions: count})
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].sessions > all[j].sessions })
	out := make([]models.CompareRow, 0, len(all))
	for i, s := range all {
		if i >= max {
			break
		}
		out = append(out, s.row)
	}
	return out
}

// addDaysToDate shifts a YYYY-MM-DD date (assumed valid) by n days.
func addDaysToDate(date string, n int) string {
	t, err := time.Parse(dateLayout, date)
	if err != nil {
		return date
	}
	return t.AddDate(0, 0, n).Format(dateLayout)
}

// RecentPRsForTrainees lists personal records set on or after since by any of the trainees,
// newest first. Two reads: the recent logs, then the full history of only the exercises in them.
func (s *ProgressInsightsService) RecentPRsForTrainees(ids []string, names map[string]string, since string, max int) ([]models.PREvent, error) {
	out := []models.PREvent{}
	recent, err := s.logs.ExerciseLogsSince(ids, since, 500)
	if err != nil || len(recent) == 0 {
		return out, err
	}
	seen := map[primitive.ObjectID]bool{}
	var exerciseIDs []primitive.ObjectID
	for _, log := range recent {
		for _, w := range log.Workouts {
			if !w.ExerciseID.IsZero() && !seen[w.ExerciseID] {
				seen[w.ExerciseID] = true
				exerciseIDs = append(exerciseIDs, w.ExerciseID)
			}
		}
	}
	history, err := s.logs.LogsForExercises(ids, exerciseIDs, winsLogCap)
	if err != nil {
		return out, err
	}
	// LogsForExercises returns whole logs; keep only the exercises that had recent activity.
	for i := range history {
		kept := history[i].Workouts[:0]
		for _, w := range history[i].Workouts {
			if seen[w.ExerciseID] {
				kept = append(kept, w)
			}
		}
		history[i].Workouts = kept
	}
	tracks, err := s.tracksFor(history)
	if err != nil {
		return out, err
	}
	for _, e := range prEvents(tracks, since) {
		if len(out) >= max {
			break
		}
		e.TraineeName = names[e.TraineeID]
		out = append(out, e)
	}
	return out, nil
}
