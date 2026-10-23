package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"sort"
	"time"
)

const (
	defaultExpectedWorkoutDays = 4
	// activityWindowDays bounds how far back activity is read. Streaks longer than this
	// are reported as the window length.
	activityWindowDays = 120
)

type AdherenceService struct {
	trainees    *repositories.TraineeRepository
	workoutLogs *repositories.WorkoutLogRepository
	dietEntries *repositories.DietEntryRepository
}

func NewAdherenceService() *AdherenceService {
	return &AdherenceService{
		trainees:    repositories.NewTraineeRepository(),
		workoutLogs: repositories.NewWorkoutLogRepository(),
		dietEntries: repositories.NewDietEntryRepository(),
	}
}

// weekStart returns local midnight of the Monday of t's week in loc.
func weekStart(t time.Time, loc *time.Location) time.Time {
	t = t.In(loc)
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7 // Monday-based week
	}
	return time.Date(t.Year(), t.Month(), t.Day()-weekday+1, 0, 0, 0, 0, loc)
}

func toSet(dates []string) map[string]struct{} {
	set := make(map[string]struct{}, len(dates))
	for _, d := range dates {
		if d != "" {
			set[d] = struct{}{}
		}
	}
	return set
}

// computeStreak counts consecutive local days with activity ending today. If today has no
// activity yet, the streak continues from yesterday (the day is not over).
func computeStreak(activity map[string]struct{}, now time.Time, loc *time.Location) int {
	day := now.In(loc)
	if _, ok := activity[localDate(day, loc)]; !ok {
		day = day.AddDate(0, 0, -1)
	}
	streak := 0
	for streak < activityWindowDays {
		if _, ok := activity[localDate(day, loc)]; !ok {
			break
		}
		streak++
		day = day.AddDate(0, 0, -1)
	}
	return streak
}

// activity loads workout and diet dates for the given trainees in two queries total.
func (s *AdherenceService) activity(traineeIDs []string, now time.Time, loc *time.Location) (workouts, diets map[string][]string, err error) {
	since := localDate(now.AddDate(0, 0, -activityWindowDays-1), loc)
	workouts, err = s.workoutLogs.ActivityDates(traineeIDs, since)
	if err != nil {
		return nil, nil, err
	}
	diets, err = s.dietEntries.ActivityDates(traineeIDs, since)
	if err != nil {
		return nil, nil, err
	}
	return workouts, diets, nil
}

// SummaryForTrainee scores one trainee's current week in loc (access is checked by the caller).
func (s *AdherenceService) SummaryForTrainee(traineeID, traineeName string, loc *time.Location) (models.AdherenceSummary, error) {
	now := time.Now()
	workouts, diets, err := s.activity([]string{traineeID}, now, loc)
	if err != nil {
		return models.AdherenceSummary{}, err
	}
	return computeSummary(traineeID, traineeName, workouts[traineeID], diets[traineeID], now, loc), nil
}

// computeSummary is the pure scoring rule: 70% workout days vs expected, 30% diet days vs 7.
// Dates are calendar dates in the user's zone, as logged by the app.
func computeSummary(traineeID, traineeName string, workoutDateList, dietDateList []string, now time.Time, loc *time.Location) models.AdherenceSummary {
	workoutDates := toSet(workoutDateList)
	dietDates := toSet(dietDateList)

	start := weekStart(now, loc)
	workoutDays, dietDays := 0, 0
	for i := 0; i < 7; i++ {
		k := localDate(start.AddDate(0, 0, i), loc)
		if _, ok := workoutDates[k]; ok {
			workoutDays++
		}
		if _, ok := dietDates[k]; ok {
			dietDays++
		}
	}

	expected := defaultExpectedWorkoutDays
	workoutRatio := float64(workoutDays) / float64(expected)
	if workoutRatio > 1 {
		workoutRatio = 1
	}
	dietRatio := float64(dietDays) / 7.0
	score := (workoutRatio*0.7 + dietRatio*0.3) * 100

	merged := make(map[string]struct{}, len(workoutDates)+len(dietDates))
	for k := range workoutDates {
		merged[k] = struct{}{}
	}
	for k := range dietDates {
		merged[k] = struct{}{}
	}

	yesterday := now.In(loc).AddDate(0, 0, -1)
	_, hadYesterday := merged[localDate(yesterday, loc)]
	// Missed if yesterday was a weekday with no activity (simple signal)
	missedYesterday := !hadYesterday && yesterday.Weekday() != time.Saturday && yesterday.Weekday() != time.Sunday

	lastActivity := ""
	for k := range merged {
		if k > lastActivity {
			lastActivity = k
		}
	}
	_, trainedToday := workoutDates[localDate(now, loc)]

	return models.AdherenceSummary{
		TraineeID:       traineeID,
		TraineeName:     traineeName,
		WeekStart:       localDate(start, loc),
		WorkoutDays:     workoutDays,
		DietDays:        dietDays,
		ExpectedDays:    expected,
		Score:           score,
		StreakDays:      computeStreak(merged, now, loc),
		AtRisk:          score < 50 || missedYesterday,
		MissedYesterday: missedYesterday,

		LastActivityDate: lastActivity,
		TrainedToday:     trainedToday,
	}
}

// RosterForTrainer scores all active trainees of a trainer in the trainer's zone, most at-risk
// first. Three queries in total regardless of roster size.
func (s *AdherenceService) RosterForTrainer(trainerKey string, limit int, loc *time.Location) ([]models.AdherenceSummary, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	roster, err := s.trainees.ListActiveRefs(trainerKey)
	if err != nil {
		return nil, err
	}
	summaries, err := s.SummariesForRefs(roster, loc)
	if err != nil {
		return nil, err
	}
	if len(summaries) > limit {
		summaries = summaries[:limit]
	}
	return summaries, nil
}

// SummariesForRefs scores the given trainees (two activity queries in total), most at-risk first.
func (s *AdherenceService) SummariesForRefs(roster []models.TraineeRef, loc *time.Location) ([]models.AdherenceSummary, error) {
	ids := make([]string, 0, len(roster))
	for _, t := range roster {
		ids = append(ids, t.ID)
	}

	now := time.Now()
	workouts, diets, err := s.activity(ids, now, loc)
	if err != nil {
		return nil, err
	}

	summaries := make([]models.AdherenceSummary, 0, len(roster))
	for _, t := range roster {
		summaries = append(summaries, computeSummary(t.ID, t.Name, workouts[t.ID], diets[t.ID], now, loc))
	}

	sort.SliceStable(summaries, func(i, j int) bool {
		if summaries[i].AtRisk != summaries[j].AtRisk {
			return summaries[i].AtRisk
		}
		return summaries[i].Score < summaries[j].Score
	})
	return summaries, nil
}
