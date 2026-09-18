package services

import (
	"ironcoach/models"
	"ironcoach/repositories"
	"sort"
	"time"
)

const defaultExpectedWorkoutDays = 4

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

func weekStartUTC(t time.Time) time.Time {
	t = t.UTC()
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7 // Monday-based week
	}
	return time.Date(t.Year(), t.Month(), t.Day()-weekday+1, 0, 0, 0, 0, time.UTC)
}

func dateKey(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

func uniqueDates(dates []string) map[string]struct{} {
	set := make(map[string]struct{}, len(dates))
	for _, d := range dates {
		if d != "" {
			set[d] = struct{}{}
		}
	}
	return set
}

func (s *AdherenceService) collectActivityDates(traineeID string) (workoutDates, dietDates map[string]struct{}, err error) {
	logs, err := s.workoutLogs.GetWorkoutLogsByTrainee(traineeID, "")
	if err != nil {
		return nil, nil, err
	}
	entries, err := s.dietEntries.GetDietEntriesByTrainee(traineeID, "")
	if err != nil {
		return nil, nil, err
	}

	wDates := make([]string, 0, len(logs))
	for _, l := range logs {
		wDates = append(wDates, l.Date)
	}
	dDates := make([]string, 0, len(entries))
	for _, e := range entries {
		dDates = append(dDates, e.Date)
	}
	return uniqueDates(wDates), uniqueDates(dDates), nil
}

func computeStreak(activity map[string]struct{}, today time.Time) int {
	streak := 0
	day := today.UTC()
	for {
		key := dateKey(day)
		if _, ok := activity[key]; !ok {
			break
		}
		streak++
		day = day.AddDate(0, 0, -1)
	}
	return streak
}

func (s *AdherenceService) SummaryForTrainee(traineeID, traineeName string) (models.AdherenceSummary, error) {
	workoutDates, dietDates, err := s.collectActivityDates(traineeID)
	if err != nil {
		return models.AdherenceSummary{}, err
	}

	now := time.Now().UTC()
	start := weekStartUTC(now)
	weekKeys := make([]string, 0, 7)
	for i := 0; i < 7; i++ {
		weekKeys = append(weekKeys, dateKey(start.AddDate(0, 0, i)))
	}

	workoutDays := 0
	dietDays := 0
	for _, k := range weekKeys {
		if _, ok := workoutDates[k]; ok {
			workoutDays++
		}
		if _, ok := dietDates[k]; ok {
			dietDays++
		}
	}

	expected := defaultExpectedWorkoutDays
	// Score: 70% workouts vs expected, 30% diet days vs 7
	workoutRatio := float64(workoutDays) / float64(expected)
	if workoutRatio > 1 {
		workoutRatio = 1
	}
	dietRatio := float64(dietDays) / 7.0
	score := (workoutRatio*0.7 + dietRatio*0.3) * 100

	merged := make(map[string]struct{})
	for k := range workoutDates {
		merged[k] = struct{}{}
	}
	for k := range dietDates {
		merged[k] = struct{}{}
	}

	yesterday := dateKey(now.AddDate(0, 0, -1))
	_, hadYesterday := merged[yesterday]
	// Missed if weekday Mon-Fri and no activity yesterday (simple signal)
	yWeekday := now.AddDate(0, 0, -1).Weekday()
	missedYesterday := !hadYesterday && yWeekday != time.Saturday && yWeekday != time.Sunday

	atRisk := score < 50 || missedYesterday

	return models.AdherenceSummary{
		TraineeID:       traineeID,
		TraineeName:     traineeName,
		WeekStart:       dateKey(start),
		WorkoutDays:     workoutDays,
		DietDays:        dietDays,
		ExpectedDays:    expected,
		Score:           score,
		StreakDays:      computeStreak(merged, now),
		AtRisk:          atRisk,
		MissedYesterday: missedYesterday,
	}, nil
}

func (s *AdherenceService) RosterForTrainer(trainerEmail string, limit int) ([]models.AdherenceSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	ids, err := s.trainees.GetTraineeIDsByTrainer(trainerEmail)
	if err != nil {
		return nil, err
	}

	summaries := make([]models.AdherenceSummary, 0, len(ids))
	for _, id := range ids {
		trainee, err := s.trainees.GetTraineeByID(id)
		if err != nil {
			continue
		}
		if !trainee.ActiveStatus {
			continue
		}
		sum, err := s.SummaryForTrainee(id, trainee.Name)
		if err != nil {
			continue
		}
		summaries = append(summaries, sum)
	}

	sort.Slice(summaries, func(i, j int) bool {
		if summaries[i].AtRisk != summaries[j].AtRisk {
			return summaries[i].AtRisk
		}
		return summaries[i].Score < summaries[j].Score
	})

	if len(summaries) > limit {
		summaries = summaries[:limit]
	}
	return summaries, nil
}
