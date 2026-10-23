package services

import (
	"testing"
	"time"
)

func TestComputeSummary(t *testing.T) {
	ist := loadLocation("Asia/Kolkata")
	// Thursday 2026-10-15 09:00 IST; the week starts Monday 2026-10-12.
	now := time.Date(2026, 10, 15, 9, 0, 0, 0, ist)

	t.Run("on track", func(t *testing.T) {
		workouts := []string{"2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"}
		diets := []string{"2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-15"}
		s := computeSummary("t1", "Asha", workouts, diets, now, ist)
		if s.WorkoutDays != 4 || s.DietDays != 4 {
			t.Fatalf("days = %d/%d, want 4/4", s.WorkoutDays, s.DietDays)
		}
		if s.WeekStart != "2026-10-12" {
			t.Fatalf("week start = %s", s.WeekStart)
		}
		if s.StreakDays != 4 {
			t.Fatalf("streak = %d, want 4", s.StreakDays)
		}
		if s.AtRisk || s.MissedYesterday {
			t.Fatalf("should not be at risk: %+v", s)
		}
	})

	t.Run("missed a weekday", func(t *testing.T) {
		s := computeSummary("t1", "", []string{"2026-10-12"}, nil, now, ist)
		if !s.MissedYesterday || !s.AtRisk {
			t.Fatalf("expected missed yesterday and at risk: %+v", s)
		}
		if s.StreakDays != 0 {
			t.Fatalf("streak = %d, want 0", s.StreakDays)
		}
	})

	t.Run("streak survives until today is logged", func(t *testing.T) {
		s := computeSummary("t1", "", []string{"2026-10-13", "2026-10-14"}, nil, now, ist)
		if s.StreakDays != 2 {
			t.Fatalf("streak = %d, want 2 (today not logged yet)", s.StreakDays)
		}
	})

	t.Run("no activity", func(t *testing.T) {
		s := computeSummary("t1", "", nil, nil, now, ist)
		if s.Score != 0 || !s.AtRisk {
			t.Fatalf("unexpected summary: %+v", s)
		}
	})

	t.Run("score capped at 100", func(t *testing.T) {
		days := []string{"2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"}
		s := computeSummary("t1", "", days, days, now, ist)
		if s.Score > 100.0001 {
			t.Fatalf("score = %v, should not exceed 100", s.Score)
		}
	})
}

// At 01:30 IST on Monday it is still Sunday in UTC. A workout the user logged "today" must count
// for the new week in their zone; the old UTC logic put it in the previous week.
func TestComputeSummaryUsesUserTimezone(t *testing.T) {
	ist := loadLocation("Asia/Kolkata")
	now := time.Date(2026, 10, 11, 20, 0, 0, 0, time.UTC) // = Mon 2026-10-12 01:30 IST

	s := computeSummary("t1", "", []string{"2026-10-12"}, nil, now, ist)
	if s.WeekStart != "2026-10-12" || s.WorkoutDays != 1 || s.StreakDays != 1 {
		t.Fatalf("IST summary wrong: %+v", s)
	}
	utc := computeSummary("t1", "", []string{"2026-10-12"}, nil, now, time.UTC)
	if utc.WeekStart != "2026-10-05" || utc.WorkoutDays != 0 {
		t.Fatalf("UTC summary should still be in the previous week: %+v", utc)
	}
}

func TestComputeStreakIsCapped(t *testing.T) {
	now := time.Date(2026, 10, 15, 12, 0, 0, 0, time.UTC)
	activity := map[string]struct{}{}
	for i := 0; i < activityWindowDays+30; i++ {
		activity[localDate(now.AddDate(0, 0, -i), time.UTC)] = struct{}{}
	}
	if got := computeStreak(activity, now, time.UTC); got != activityWindowDays {
		t.Fatalf("streak = %d, want cap %d", got, activityWindowDays)
	}
}

func TestValidateNotFuture(t *testing.T) {
	ist := loadLocation("Asia/Kolkata")
	now := time.Date(2026, 10, 15, 23, 0, 0, 0, ist)
	for date, wantErr := range map[string]bool{
		"2026-10-15": false,
		"2026-10-16": false, // one day of slack for clock/zone drift
		"2026-10-17": true,
		"2025-01-01": false,
	} {
		if err := validateNotFuture("date", date, ist, now); (err != nil) != wantErr {
			t.Errorf("%s: err = %v, wantErr %v", date, err, wantErr)
		}
	}
}

func TestTimezoneHelpers(t *testing.T) {
	if !validTimezone("Asia/Kolkata") || validTimezone("Mars/Base") || validTimezone("") || validTimezone("Local") {
		t.Fatal("validTimezone gave a wrong answer")
	}
	if loadLocation("Not/AZone").String() != DefaultTimezone {
		t.Fatal("unknown zones should fall back to the default")
	}
}

func TestComputeSummaryLastActivityAndTrainedToday(t *testing.T) {
	ist := loadLocation("Asia/Kolkata")
	now := time.Date(2026, 10, 15, 9, 0, 0, 0, ist)

	s := computeSummary("t1", "", []string{"2026-10-13", "2026-10-15"}, []string{"2026-10-14"}, now, ist)
	if s.LastActivityDate != "2026-10-15" || !s.TrainedToday {
		t.Fatalf("workout today: %+v", s)
	}

	// A meal logged today is activity but not a workout.
	s = computeSummary("t1", "", []string{"2026-10-13"}, []string{"2026-10-15"}, now, ist)
	if s.LastActivityDate != "2026-10-15" || s.TrainedToday {
		t.Fatalf("diet only today: %+v", s)
	}

	s = computeSummary("t1", "", nil, nil, now, ist)
	if s.LastActivityDate != "" || s.TrainedToday {
		t.Fatalf("no activity: %+v", s)
	}
}
