package services

import (
	"ironcoach/models"
	"testing"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestEstimatedOneRM(t *testing.T) {
	cases := []struct {
		w    float64
		reps int
		want float64
	}{
		{100, 1, 100},
		{100, 8, 126.7},
		{100, 0, 0},
		{0, 10, 0},
		{60, 30, 120},
	}
	for _, c := range cases {
		if got := estimatedOneRM(c.w, c.reps); got != c.want {
			t.Errorf("estimatedOneRM(%v, %d) = %v, want %v", c.w, c.reps, got, c.want)
		}
	}
}

func TestPace(t *testing.T) {
	if got := paceSPerKm(5000, 1800); got != 360 {
		t.Errorf("pace = %v, want 360", got)
	}
	if got := paceSPerKm(0, 1800); got != 0 {
		t.Errorf("pace without distance = %v, want 0", got)
	}
}

func TestEntriesOfLegacyArrays(t *testing.T) {
	// Old logs: parallel arrays, possibly of different lengths.
	w := models.Workout{Reps: []int{10, 8, 6}, Weight: []float64{50, 55}}
	got := models.EntriesOf(w)
	if len(got) != 2 || got[1].WeightKg != 55 || got[1].Reps != 8 {
		t.Fatalf("EntriesOf legacy = %+v", got)
	}
	// New logs: entries win over the mirrored arrays.
	w.Entries = []models.SetEntry{{WeightKg: 100, Reps: 5}}
	if got := models.EntriesOf(w); len(got) != 1 || got[0].WeightKg != 100 {
		t.Fatalf("EntriesOf entries = %+v", got)
	}
}

func logWith(id primitive.ObjectID, date, key string, entries ...models.SetEntry) models.WorkoutLog {
	return models.WorkoutLog{
		ID: primitive.NewObjectID().Hex(), TraineeID: "t1", Date: date, ExerciseKey: key,
		Workouts: []models.Workout{{Exercise: "Row", ExerciseID: id, Entries: entries}},
	}
}

func TestSessionsForExerciseMergesDatesAndIgnoresOthers(t *testing.T) {
	row := primitive.NewObjectID()
	other := primitive.NewObjectID()
	legacy := models.WorkoutLog{
		ID: "legacy", TraineeID: "t1", Date: "2026-10-01",
		Workouts: []models.Workout{
			{Exercise: "Row", ExerciseID: row, Reps: []int{10}, Weight: []float64{80}},
			{Exercise: "Curl", ExerciseID: other, Reps: []int{12}, Weight: []float64{10}},
		},
	}
	keyed := logWith(row, "2026-10-01", row.Hex(), models.SetEntry{WeightKg: 90, Reps: 8})
	later := logWith(row, "2026-10-08", row.Hex(), models.SetEntry{WeightKg: 95, Reps: 6})

	sessions := sessionsForExercise([]models.WorkoutLog{later, legacy, keyed}, row.Hex())
	if len(sessions) != 2 {
		t.Fatalf("sessions = %d, want 2", len(sessions))
	}
	if sessions[0].Date != "2026-10-01" || len(sessions[0].Entries) != 2 {
		t.Fatalf("first session = %+v, want merged day with 2 sets", sessions[0])
	}
	if sessions[0].LogID != keyed.ID {
		t.Fatalf("session log id = %s, want the keyed log %s", sessions[0].LogID, keyed.ID)
	}
}

func TestComputeBestsAndRepRecords(t *testing.T) {
	sessions := []models.ExerciseSession{
		{Date: "2026-10-01", Entries: []models.SetEntry{{WeightKg: 80, Reps: 12}, {WeightKg: 100, Reps: 5}}},
		{Date: "2026-10-08", Entries: []models.SetEntry{{WeightKg: 85, Reps: 12}, {WeightKg: 100, Reps: 7}}},
	}
	b, records := computeBests(sessions)
	if b.Sessions != 2 || b.MaxWeight != 100 || b.MaxReps != 12 {
		t.Fatalf("bests = %+v", b)
	}
	if b.E1RM != 123.3 || b.E1RMDate != "2026-10-08" {
		t.Fatalf("e1rm = %v on %s, want 123.3 on 2026-10-08", b.E1RM, b.E1RMDate)
	}
	want := map[int]float64{5: 100, 7: 100, 12: 85}
	if len(records) != len(want) {
		t.Fatalf("rep records = %+v", records)
	}
	for _, r := range records {
		if want[r.Reps] != r.WeightKg {
			t.Errorf("rep %d record = %v, want %v", r.Reps, r.WeightKg, want[r.Reps])
		}
	}
}

func TestPRFlagsWeightReps(t *testing.T) {
	prior := []models.ExerciseSession{
		{Date: "2026-10-27", Entries: []models.SetEntry{{WeightKg: 90, Reps: 10}, {WeightKg: 100, Reps: 7}}},
	}
	bests, records := computeBests(prior)

	// 100x8 beats the best e1RM (100x7 = 123.3) and the 8-rep record does not exist yet.
	today := []models.SetEntry{{WeightKg: 100, Reps: 4}, {WeightKg: 100, Reps: 8}}
	flags := prFlags(models.ExerciseWeightReps, today, bests, records)
	if flags[0] || !flags[1] {
		t.Fatalf("flags = %v, want [false true]", flags)
	}

	// 95x10 beats the 10-rep record (90) without beating e1RM.
	flags = prFlags(models.ExerciseWeightReps, []models.SetEntry{{WeightKg: 95, Reps: 10}}, bests, records)
	if !flags[0] {
		t.Fatalf("rep-max PR not flagged: %v", flags)
	}

	// Equal is not a record.
	flags = prFlags(models.ExerciseWeightReps, []models.SetEntry{{WeightKg: 100, Reps: 7}}, bests, records)
	if flags[0] {
		t.Fatalf("matching the record was flagged")
	}
}

func TestPRFlagsFirstSessionHasNoRecords(t *testing.T) {
	flags := prFlags(models.ExerciseWeightReps, []models.SetEntry{{WeightKg: 200, Reps: 1}}, models.ExerciseBests{}, nil)
	if flags[0] {
		t.Fatal("first ever session should not be a PR")
	}
}

func TestPRFlagsCardio(t *testing.T) {
	prior := []models.ExerciseSession{{Date: "2026-10-01", Entries: []models.SetEntry{{DistanceM: 5000, DurationS: 1800}}}}
	bests, records := computeBests(prior)
	// Same distance, faster: pace PR only.
	flags := prFlags(models.ExerciseDistanceTime, []models.SetEntry{{DistanceM: 5000, DurationS: 1700}}, bests, records)
	if !flags[0] {
		t.Fatal("faster pace not flagged")
	}
	// Short sprint: not a pace record, not a distance record.
	flags = prFlags(models.ExerciseDistanceTime, []models.SetEntry{{DistanceM: 200, DurationS: 30}}, bests, records)
	if flags[0] {
		t.Fatal("200 m sprint flagged as a record")
	}
}

func TestBuildExerciseStatsSeriesAndRange(t *testing.T) {
	sessions := []models.ExerciseSession{
		{Date: "2026-01-01", Entries: []models.SetEntry{{WeightKg: 60, Reps: 10}}},
		{Date: "2026-10-01", Entries: []models.SetEntry{{WeightKg: 80, Reps: 10}, {WeightKg: 90, Reps: 5}}},
	}
	stats := buildExerciseStats(models.ExerciseWeightReps, "3m", "2026-08-01", sessions)
	if got := stats.Series[SeriesE1RM]; len(got) != 1 || got[0].Date != "2026-10-01" {
		t.Fatalf("e1rm series = %+v, want only the in-range session", got)
	}
	if got := stats.Series[SeriesWorkoutVolume]; got[0].Value != 1250 {
		t.Fatalf("workout volume = %v, want 1250", got[0].Value)
	}
	if stats.Bests.Sessions != 2 {
		t.Fatalf("bests must be all-time, got %d sessions", stats.Bests.Sessions)
	}

	cardio := buildExerciseStats(models.ExerciseDistanceTime, "all", "", []models.ExerciseSession{
		{Date: "2026-10-01", Entries: []models.SetEntry{{DistanceM: 3000, DurationS: 900}, {DistanceM: 2000, DurationS: 900}}},
	})
	if got := cardio.Series[SeriesPace][0].Value; got != 360 {
		t.Fatalf("pace = %v, want 360 s/km", got)
	}
	if len(cardio.RepRecords) != 0 {
		t.Fatal("cardio should have no rep records")
	}
}

func TestPREventsAndTracks(t *testing.T) {
	row := primitive.NewObjectID()
	logs := []models.WorkoutLog{
		logWith(row, "2026-10-01", "", models.SetEntry{WeightKg: 100, Reps: 5}),
		logWith(row, "2026-10-08", "", models.SetEntry{WeightKg: 100, Reps: 4}),
		logWith(row, "2026-10-15", "", models.SetEntry{WeightKg: 105, Reps: 5}),
	}
	tracks := tracksFromLogs(logs, map[string]string{})
	if len(tracks) != 1 || len(tracks[0].Sessions) != 3 {
		t.Fatalf("tracks = %+v", tracks)
	}
	events := prEvents(tracks, "2026-10-01")
	if len(events) != 1 || events[0].Date != "2026-10-15" || events[0].Kind != PRKindE1RM {
		t.Fatalf("events = %+v, want one e1RM PR on 2026-10-15", events)
	}
	if events := prEvents(tracks, "2026-10-16"); len(events) != 0 {
		t.Fatalf("events before since leaked: %+v", events)
	}
}

func TestValidateSetEntriesByType(t *testing.T) {
	entries := []models.SetEntry{{WeightKg: 50, Reps: 10, DistanceM: 100}}
	if err := validateSetEntries(models.ExerciseWeightReps, entries); err != nil {
		t.Fatal(err)
	}
	if entries[0].DistanceM != 0 {
		t.Fatal("distance should be cleared on a weight exercise")
	}
	if err := validateSetEntries(models.ExerciseWeightReps, []models.SetEntry{{WeightKg: 50}}); err == nil {
		t.Fatal("a set without reps was accepted")
	}
	if err := validateSetEntries(models.ExerciseDistanceTime, []models.SetEntry{{}}); err == nil {
		t.Fatal("an empty cardio set was accepted")
	}
	cardio := []models.SetEntry{{DistanceM: 5000, DurationS: 1800, Reps: 3, WeightKg: 10}}
	if err := validateSetEntries(models.ExerciseDistanceTime, cardio); err != nil {
		t.Fatal(err)
	}
	if cardio[0].Reps != 0 || cardio[0].WeightKg != 0 {
		t.Fatal("reps/weight should be cleared on cardio")
	}
	if err := validateSetEntries(models.ExerciseTime, []models.SetEntry{{DurationS: 60}}); err != nil {
		t.Fatal(err)
	}
	if err := validateSetEntries(models.ExerciseWeightReps, []models.SetEntry{{WeightKg: 2000, Reps: 1}}); err == nil {
		t.Fatal("2000 kg accepted")
	}
}

func TestWorkoutFromEntriesMirrorsLegacyArrays(t *testing.T) {
	ex := models.Exercise{ID: primitive.NewObjectID(), Name: "Row", Type: models.ExerciseWeightReps}
	w := workoutFromEntries(ex, []models.SetEntry{{WeightKg: 100, Reps: 4}, {WeightKg: 100, Reps: 8}})
	if w.Sets != 2 || w.Reps[1] != 8 || w.Weight[0] != 100 {
		t.Fatalf("legacy mirror = %+v", w)
	}
	// Mirrored arrays must still pass the legacy validator used by the old edit flow.
	if err := validateWorkouts([]models.Workout{w}); err != nil {
		t.Fatal(err)
	}
}

func TestNormalizeActivities(t *testing.T) {
	got, err := normalizeActivities([]string{"gym", "cardio", "gym"})
	if err != nil || len(got) != 2 || got[1] != "cardio" {
		t.Fatalf("normalizeActivities = %v, %v", got, err)
	}
	if _, err := normalizeActivities([]string{"golf"}); err == nil {
		t.Fatal("unknown activity accepted")
	}
	if got := activitiesFromInterests([]string{"gym", "golf", "swimming"}); len(got) != 2 {
		t.Fatalf("activitiesFromInterests = %v", got)
	}
}

func TestLiftChangesAndCompare(t *testing.T) {
	row := primitive.NewObjectID()
	tracks := tracksFromLogs([]models.WorkoutLog{
		logWith(row, "2026-05-17", "", models.SetEntry{WeightKg: 80, Reps: 12}),
		logWith(row, "2026-11-03", "", models.SetEntry{WeightKg: 100, Reps: 8}),
	}, map[string]string{})
	lifts := liftChanges(tracks, 6)
	if len(lifts) != 1 || lifts[0].First.Value != 112 || lifts[0].Latest.Value != 126.7 {
		t.Fatalf("lifts = %+v", lifts)
	}
	rows := compareLifts(tracks, "2026-05-20", "2026-11-05", 10)
	if len(rows) != 1 || rows[0].From == nil || rows[0].To == nil || rows[0].From.Value != 112 || rows[0].To.Value != 126.7 {
		t.Fatalf("compare rows = %+v", rows)
	}
}
