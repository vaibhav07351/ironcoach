package services

import (
	"sync"
	"testing"
	"time"

	"ironcoach/models"
	"ironcoach/repositories"

	"go.mongodb.org/mongo-driver/bson"
)

// exerciseNamed returns one of the trainee's seeded exercises by name.
func exerciseNamed(t *testing.T, traineeID, name string) models.Exercise {
	t.Helper()
	list, err := NewExerciseService().SearchExercises(traineeID, name)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range list {
		if e.Name == name {
			return e
		}
	}
	t.Fatalf("exercise %q not in catalog", name)
	return models.Exercise{}
}

func TestIntegrationExerciseDayFlow(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	row := exerciseNamed(t, traineeID, "Seated Cable Row")
	svc := NewExerciseLogService()
	today := localDate(time.Now(), trainer.Location())
	lastWeek := localDate(time.Now().AddDate(0, 0, -7), trainer.Location())

	if _, err := svc.SaveDay(trainer, traineeID, row.ID.Hex(), lastWeek, models.ExerciseDayInput{
		Entries: []models.SetEntry{{WeightKg: 90, Reps: 10}, {WeightKg: 100, Reps: 7}},
	}); err != nil {
		t.Fatal(err)
	}

	// Saving the same day concurrently (double tap, retry) must still leave one log.
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = svc.SaveDay(trainer, traineeID, row.ID.Hex(), today, models.ExerciseDayInput{
				Entries: []models.SetEntry{{WeightKg: 100, Reps: 4}},
			})
		}()
	}
	wg.Wait()
	if n := countDocs(t, "workout_logs", bson.M{"trainee_id": traineeID, "date": today, "exercise_key": row.ID.Hex()}); n != 1 {
		t.Fatalf("logs for today = %d, want 1", n)
	}

	saved, err := svc.SaveDay(trainer, traineeID, row.ID.Hex(), today, models.ExerciseDayInput{
		Entries: []models.SetEntry{{WeightKg: 100, Reps: 4}, {WeightKg: 100, Reps: 8}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !saved.NewPR || saved.PRFlags[0] || !saved.PRFlags[1] {
		t.Fatalf("pr flags = %v new=%v, want second set as PR", saved.PRFlags, saved.NewPR)
	}
	if saved.Log.ActivityType != models.ActivityGym || saved.Log.Workouts[0].Sets != 2 {
		t.Fatalf("saved log = %+v", saved.Log)
	}

	day, err := svc.GetDay(trainer, traineeID, row.ID.Hex(), today)
	if err != nil {
		t.Fatal(err)
	}
	if day.Previous == nil || day.Previous.Date != lastWeek || len(day.Previous.Entries) != 2 {
		t.Fatalf("previous = %+v", day.Previous)
	}

	history, err := svc.History(trainer, traineeID, row.ID.Hex(), "", NewPagination(10, 0, 10, 100))
	if err != nil || len(history) != 2 || history[0].Date != today {
		t.Fatalf("history = %+v, %v", history, err)
	}

	stats, err := svc.Stats(trainer, traineeID, row.ID.Hex(), "1m")
	if err != nil || len(stats.Series[SeriesE1RM]) != 2 {
		t.Fatalf("stats = %+v, %v", stats, err)
	}

	// Clearing all sets removes the exercise from the day.
	if _, err := svc.SaveDay(trainer, traineeID, row.ID.Hex(), today, models.ExerciseDayInput{}); err != nil {
		t.Fatal(err)
	}
	if n := countDocs(t, "workout_logs", bson.M{"trainee_id": traineeID, "date": today}); n != 0 {
		t.Fatalf("logs after clearing = %d, want 0", n)
	}
}

func TestIntegrationExerciseDayRejectsForeignExercise(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	mine := newTrainee(t, trainer)
	other := newTrainee(t, trainer)
	theirRow := exerciseNamed(t, other, "Seated Cable Row")

	today := localDate(time.Now(), trainer.Location())
	_, err := NewExerciseLogService().SaveDay(trainer, mine, theirRow.ID.Hex(), today, models.ExerciseDayInput{
		Entries: []models.SetEntry{{WeightKg: 50, Reps: 5}},
	})
	if !IsKind(err, KindNotFound) {
		t.Fatalf("err = %v, want not found for another client's exercise", err)
	}

	stranger := newTrainer(t)
	if _, err := NewExerciseLogService().GetDay(stranger, other, theirRow.ID.Hex(), today); !IsKind(err, KindForbidden) && !IsKind(err, KindNotFound) {
		t.Fatalf("stranger read = %v, want forbidden/not found", err)
	}
}

func TestIntegrationCardioBackfilledOnce(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)

	// Simulate a catalog seeded before Cardio existed.
	cats := repositories.NewCategoryRepository()
	list, err := cats.GetCategoriesByTrainee(traineeID)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range list {
		if c.Name == cardioCategoryName {
			if err := NewCategoryService().DeleteCategory(c.ID.Hex(), traineeID); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := repositories.NewTraineeRepository().ReleaseFlag(traineeID, cardioSeededFlag); err != nil {
		t.Fatal(err)
	}

	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = NewCategoryService().GetCategories(traineeID)
		}()
	}
	wg.Wait()
	if n := countDocs(t, "categories", bson.M{"trainee_id": traineeID, "name": cardioCategoryName}); n != 1 {
		t.Fatalf("cardio categories = %d, want 1", n)
	}
	run := exerciseNamed(t, traineeID, "Running (Treadmill)")
	if run.Type != models.ExerciseDistanceTime {
		t.Fatalf("treadmill type = %q", run.Type)
	}

	today := localDate(time.Now(), trainer.Location())
	saved, err := NewExerciseLogService().SaveDay(trainer, traineeID, run.ID.Hex(), today, models.ExerciseDayInput{
		Entries: []models.SetEntry{{DistanceM: 5000, DurationS: 1800}},
	})
	if err != nil || saved.Log.ActivityType != models.ActivityCardio {
		t.Fatalf("cardio save = %+v, %v", saved.Log, err)
	}
}

func TestIntegrationBodyMeasurements(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	svc := NewBodyMeasurementService()
	today := localDate(time.Now(), trainer.Location())
	earlier := localDate(time.Now().AddDate(0, 0, -7), trainer.Location())

	for _, in := range []models.BodyMeasurementInput{
		{TraineeID: traineeID, Metric: models.MetricWaist, Date: earlier, Value: 88},
		{TraineeID: traineeID, Metric: models.MetricWaist, Date: today, Value: 80},
		{TraineeID: traineeID, Metric: models.MetricWaist, Date: today, Value: 79}, // replaces
		{TraineeID: traineeID, Metric: models.MetricBodyweight, Date: today, Value: 58.5},
	} {
		if err := svc.Record(trainer, in); err != nil {
			t.Fatal(err)
		}
	}
	if err := svc.Record(trainer, models.BodyMeasurementInput{TraineeID: traineeID, Metric: models.MetricWaist, Date: today, Value: 5}); !IsKind(err, KindValidation) {
		t.Fatalf("5 cm waist = %v, want validation error", err)
	}

	summary, err := svc.Summary(traineeID)
	if err != nil {
		t.Fatal(err)
	}
	if summary[0].Metric != models.MetricBodyweight || summary[0].Latest == nil || summary[0].Latest.Value != 58.5 {
		t.Fatalf("bodyweight summary = %+v", summary[0])
	}
	var waist models.BodyMetricSummary
	for _, s := range summary {
		if s.Metric == models.MetricWaist {
			waist = s
		}
	}
	if waist.Latest == nil || waist.Latest.Value != 79 || waist.Previous == nil || waist.Previous.Value != 88 {
		t.Fatalf("waist summary = %+v", waist)
	}

	cmp, err := NewProgressInsightsService().Compare(trainer, traineeID, earlier, today)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, r := range cmp.Rows {
		if r.Key == models.MetricWaist && r.From != nil && r.To != nil && r.From.Value == 88 && r.To.Value == 79 {
			found = true
		}
	}
	if !found {
		t.Fatalf("compare rows = %+v", cmp.Rows)
	}
}
