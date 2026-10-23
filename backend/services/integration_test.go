package services

// Integration tests against a real MongoDB. They run only when MONGODB_TEST_URI points at a
// local server (CI starts one); they DROP their test database on that server, so remote
// URIs are refused to protect real data.

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ironcoach/database"
	"ironcoach/models"
	"ironcoach/repositories"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestMain(m *testing.M) {
	if os.Getenv("JWT_SECRET") == "" {
		_ = os.Setenv("JWT_SECRET", "integration-test-secret")
	}
	uri := os.Getenv("MONGODB_TEST_URI")
	if uri != "" {
		if !isLocalMongo(uri) {
			fmt.Fprintln(os.Stderr, "MONGODB_TEST_URI must point at localhost; refusing to drop a remote database")
			os.Exit(1)
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err == nil {
			err = client.Ping(ctx, nil)
		}
		cancel()
		if err != nil {
			fmt.Fprintln(os.Stderr, "cannot reach test MongoDB:", err)
			os.Exit(1)
		}
		database.DB = client
		database.DBName = "ironcoach_test_services"
	}
	os.Exit(m.Run())
}

func isLocalMongo(uri string) bool {
	u, err := url.Parse(uri)
	if err != nil || u.Scheme != "mongodb" {
		return false
	}
	host := u.Hostname()
	return host == "localhost" || host == "127.0.0.1" || host == "::1"
}

// freshDB skips when no test database is configured, otherwise wipes it and creates indexes.
func freshDB(t *testing.T) {
	t.Helper()
	if database.DB == nil {
		t.Skip("MONGODB_TEST_URI not set; skipping integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := database.Database().Drop(ctx); err != nil {
		t.Fatalf("drop test db: %v", err)
	}
	if failed := repositories.EnsureIndexes(); failed > 0 {
		t.Fatalf("index creation failed for %d collections", failed)
	}
}

var seq int64

func uniq(prefix string) string {
	return fmt.Sprintf("%s%d", prefix, atomic.AddInt64(&seq, 1))
}

func newTrainer(t *testing.T) Principal {
	t.Helper()
	email := uniq("coach") + "@x.com"
	id := primitive.NewObjectID().Hex()
	if _, err := repositories.NewUserRepository().Create(models.User{ID: id, GoogleSub: uniq("g"), Email: email, Role: models.RoleTrainer, TrainerID: id}); err != nil {
		t.Fatal(err)
	}
	if err := NewTrainerService().RegisterTrainer(models.Trainer{UserID: id, Name: "Coach", Email: email}); err != nil {
		t.Fatal(err)
	}
	return Principal{UserID: id, Email: email, Role: models.RoleTrainer, TrainerKey: id, Timezone: DefaultTimezone}
}

func newClient(t *testing.T) Principal {
	t.Helper()
	email := uniq("client") + "@x.com"
	u, err := repositories.NewUserRepository().Create(models.User{GoogleSub: uniq("g"), Email: email, Role: models.RoleClient})
	if err != nil {
		t.Fatal(err)
	}
	return Principal{UserID: u.ID, Email: email, Role: models.RoleClient}
}

// reload re-reads a principal from the database, as AuthMiddleware does per request.
func reload(t *testing.T, p Principal) Principal {
	t.Helper()
	fresh, err := NewAccessService().ResolvePrincipal(p.UserID)
	if err != nil {
		t.Fatal(err)
	}
	return fresh
}

func newTrainee(t *testing.T, trainer Principal) string {
	t.Helper()
	name := "Client"
	id, err := NewTraineeService().AddTrainee(trainer, models.TraineeInput{Name: &name})
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func countDocs(t *testing.T, coll string, filter bson.M) int64 {
	t.Helper()
	n, err := database.Database().Collection(coll).CountDocuments(context.Background(), filter)
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func TestIntegrationInviteRedeemRace(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	invite, err := NewInviteService().CreateInvite(trainer, traineeID)
	if err != nil {
		t.Fatal(err)
	}

	// Ten different clients race to redeem the same code: exactly one may win.
	const n = 10
	clients := make([]Principal, n)
	for i := range clients {
		clients[i] = newClient(t)
	}
	var wins int64
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(p Principal) {
			defer wg.Done()
			if _, err := NewInviteService().RedeemInvite(p, invite.Code, true); err == nil {
				atomic.AddInt64(&wins, 1)
			}
		}(clients[i])
	}
	wg.Wait()

	if wins != 1 {
		t.Fatalf("successful redeems = %d, want 1", wins)
	}
	if got := countDocs(t, "users", bson.M{"trainee_id": traineeID}); got != 1 {
		t.Fatalf("users linked to trainee = %d, want 1", got)
	}
	trainee, err := repositories.NewTraineeRepository().GetTraineeByID(traineeID)
	if err != nil || trainee.UserID == "" {
		t.Fatalf("trainee not linked: %v %+v", err, trainee)
	}
}

func TestIntegrationRedeemTwoInvitesSameClient(t *testing.T) {
	freshDB(t)
	trainerA, trainerB := newTrainer(t), newTrainer(t)
	invA, err := NewInviteService().CreateInvite(trainerA, newTrainee(t, trainerA))
	if err != nil {
		t.Fatal(err)
	}
	invB, err := NewInviteService().CreateInvite(trainerB, newTrainee(t, trainerB))
	if err != nil {
		t.Fatal(err)
	}
	client := newClient(t)

	var wg sync.WaitGroup
	for _, code := range []string{invA.Code, invB.Code} {
		wg.Add(1)
		go func(code string) {
			defer wg.Done()
			_, _ = NewInviteService().RedeemInvite(client, code, true)
		}(code)
	}
	wg.Wait()

	if got := countDocs(t, "trainees", bson.M{"user_id": client.UserID}); got != 1 {
		t.Fatalf("client linked to %d trainees, want 1", got)
	}
	// The losing invite must be released so the coach can still use it for someone else.
	if got := countDocs(t, "invites", bson.M{"used_by": client.UserID}); got != 1 {
		t.Fatalf("invites consumed = %d, want 1", got)
	}
}

func TestIntegrationCoachAcceptRace(t *testing.T) {
	freshDB(t)
	trainerA, trainerB := newTrainer(t), newTrainer(t)
	client := newClient(t)
	svc := NewCoachRequestService()
	reqA, err := svc.Create(client, trainerA.TrainerKey, true)
	if err != nil {
		t.Fatal(err)
	}
	reqB, err := svc.Create(client, trainerB.TrainerKey, true)
	if err != nil {
		t.Fatal(err)
	}

	// Both coaches accept at once, and coach A double-taps.
	var wins int64
	var wg sync.WaitGroup
	accept := func(p Principal, id string) {
		defer wg.Done()
		if _, err := NewCoachRequestService().Accept(p, id); err == nil {
			atomic.AddInt64(&wins, 1)
		}
	}
	wg.Add(3)
	go accept(trainerA, reqA.ID)
	go accept(trainerA, reqA.ID)
	go accept(trainerB, reqB.ID)
	wg.Wait()

	if wins != 1 {
		t.Fatalf("successful accepts = %d, want 1", wins)
	}
	if got := countDocs(t, "trainees", bson.M{"user_id": client.UserID}); got != 1 {
		t.Fatalf("trainees linked to client = %d, want 1 (no orphan duplicates)", got)
	}
	if got := countDocs(t, "trainees", bson.M{}); got != 1 {
		t.Fatalf("total trainees = %d, want 1 (losing accept must clean up)", got)
	}
	if fresh := reload(t, client); fresh.TraineeID == "" {
		t.Fatal("client should be linked after accept")
	}
}

func TestIntegrationRecordAccessIsolation(t *testing.T) {
	freshDB(t)
	owner := newTrainer(t)
	otherTrainer := newTrainer(t)
	traineeID := newTrainee(t, owner)
	stranger := newClient(t)

	logs := NewWorkoutLogService()
	in := models.WorkoutLogInput{TraineeID: traineeID, Date: "2026-10-12", Workouts: []models.Workout{{Exercise: "Squats", Sets: 1, Reps: []int{5}, Weight: []float64{60}}}}
	log, _, err := logs.AddWorkoutLog(owner, in)
	if err != nil {
		t.Fatal(err)
	}

	// Neither another trainer nor an unrelated client may create, edit or delete the records.
	for name, p := range map[string]Principal{"other trainer": otherTrainer, "stranger client": stranger} {
		if _, _, err := logs.AddWorkoutLog(p, in); !IsKind(err, KindForbidden) {
			t.Errorf("%s add: got %v, want forbidden", name, err)
		}
		notes := "hacked"
		if err := logs.UpdateWorkoutLog(p, log.ID, models.WorkoutLogUpdate{Notes: &notes}); !IsKind(err, KindForbidden) {
			t.Errorf("%s update: got %v, want forbidden", name, err)
		}
		if err := logs.DeleteWorkoutLog(p, log.ID); !IsKind(err, KindForbidden) {
			t.Errorf("%s delete: got %v, want forbidden", name, err)
		}
	}

	diets := NewDietEntryService()
	entryID, err := diets.AddDietEntry(owner, models.DietEntryInput{TraineeID: traineeID, Date: "2026-10-12", Meals: []models.Meal{{Name: "Lunch", Foods: []models.Food{{Name: "Rice", Calories: 200}}}}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := diets.GetDietEntryByID(stranger, entryID); !IsKind(err, KindForbidden) {
		t.Errorf("stranger read diet: got %v, want forbidden", err)
	}
	// A second entry for the same day is a conflict, not a duplicate.
	if _, err := diets.AddDietEntry(owner, models.DietEntryInput{TraineeID: traineeID, Date: "2026-10-12"}); !IsKind(err, KindConflict) {
		t.Errorf("duplicate day entry: got %v, want conflict", err)
	}
	// Updating keeps trainee_id/date and recomputes totals.
	meals := []models.Meal{{Name: "Dinner", Foods: []models.Food{{Name: "Dal", Calories: 300, Proteins: 18}}}}
	if err := diets.UpdateDietEntry(owner, entryID, models.DietEntryUpdate{Meals: &meals}); err != nil {
		t.Fatal(err)
	}
	entry, err := diets.GetDietEntryByID(owner, entryID)
	if err != nil || entry.TotalCalories != 300 || entry.TraineeID != traineeID || entry.CreatedAt.IsZero() {
		t.Fatalf("unexpected entry after update: %v %+v", err, entry)
	}
}

func TestIntegrationWorkoutLogIdempotency(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	in := models.WorkoutLogInput{TraineeID: traineeID, Date: "2026-10-12", ClientID: "offline-retry-0001",
		Workouts: []models.Workout{{Exercise: "Squats", Sets: 1, Reps: []int{5}, Weight: []float64{60}}}}

	first, created, err := NewWorkoutLogService().AddWorkoutLog(trainer, in)
	if err != nil || !created {
		t.Fatalf("first create: %v created=%v", err, created)
	}
	second, created, err := NewWorkoutLogService().AddWorkoutLog(trainer, in)
	if err != nil || created || second.ID != first.ID {
		t.Fatalf("retry should return the original log: %v created=%v %s vs %s", err, created, second.ID, first.ID)
	}
	if got := countDocs(t, "workout_logs", bson.M{"trainee_id": traineeID}); got != 1 {
		t.Fatalf("logs = %d, want 1", got)
	}
}

func TestIntegrationLeaveCoachRevokesAccess(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	invite, err := NewInviteService().CreateInvite(trainer, traineeID)
	if err != nil {
		t.Fatal(err)
	}
	client := newClient(t)
	if _, err := NewInviteService().RedeemInvite(client, invite.Code, true); err != nil {
		t.Fatal(err)
	}
	client = reload(t, client)
	if _, err := NewAccessService().AuthorizeTrainee(client, traineeID); err != nil {
		t.Fatalf("linked client should have access: %v", err)
	}

	if err := NewAccountService().LeaveCoach(client); err != nil {
		t.Fatal(err)
	}
	client = reload(t, client)
	if client.TraineeID != "" {
		t.Fatal("client should be unlinked")
	}
	if _, err := NewAccessService().AuthorizeTrainee(client, traineeID); err == nil {
		t.Fatal("access must be revoked immediately after leaving")
	}
	// The coach can invite someone again.
	if _, err := NewInviteService().CreateInvite(trainer, traineeID); err != nil {
		t.Fatalf("coach should be able to re-invite: %v", err)
	}
}

func TestIntegrationDeleteTrainerAccount(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	invite, err := NewInviteService().CreateInvite(trainer, traineeID)
	if err != nil {
		t.Fatal(err)
	}
	client := newClient(t)
	if _, err := NewInviteService().RedeemInvite(client, invite.Code, true); err != nil {
		t.Fatal(err)
	}
	if _, _, err := NewWorkoutLogService().AddWorkoutLog(trainer, models.WorkoutLogInput{TraineeID: traineeID, Date: "2026-10-12",
		Workouts: []models.Workout{{Exercise: "Squats", Sets: 1, Reps: []int{5}, Weight: []float64{60}}}}); err != nil {
		t.Fatal(err)
	}

	if err := NewAccountService().DeleteAccount(trainer); err != nil {
		t.Fatal(err)
	}
	// Retrying after success is harmless (idempotent).
	if err := NewAccountService().DeleteAccount(trainer); err != nil {
		t.Fatalf("retry should succeed: %v", err)
	}

	for coll, filter := range map[string]bson.M{
		"users":        {"_id": trainer.UserID},
		"trainers":     {"user_id": trainer.UserID},
		"trainees":     {"trainer_id": trainer.TrainerKey},
		"workout_logs": {"trainee_id": traineeID},
		"categories":   {"trainee_id": traineeID},
		"invites":      {"trainee_id": traineeID},
	} {
		if got := countDocs(t, coll, filter); got != 0 {
			t.Errorf("%s still has %d documents", coll, got)
		}
	}
	// The client keeps their login but is no longer linked.
	if fresh := reload(t, client); fresh.TraineeID != "" || fresh.TrainerKey != "" {
		t.Fatalf("client should be unlinked: %+v", fresh)
	}
	if _, err := NewAccessService().ResolvePrincipal(trainer.UserID); !IsKind(err, KindUnauthorized) {
		t.Fatalf("deleted trainer must not resolve: %v", err)
	}
}

func TestIntegrationDeleteClientAccount(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer)
	invite, err := NewInviteService().CreateInvite(trainer, traineeID)
	if err != nil {
		t.Fatal(err)
	}
	client := newClient(t)
	if _, err := NewInviteService().RedeemInvite(client, invite.Code, true); err != nil {
		t.Fatal(err)
	}
	client = reload(t, client)
	if _, err := NewRatingService().Upsert(client, models.RatingToTrainer, trainer.TrainerKey, 4); err != nil {
		t.Fatal(err)
	}

	if err := NewAccountService().DeleteAccount(client); err != nil {
		t.Fatal(err)
	}
	if got := countDocs(t, "users", bson.M{"_id": client.UserID}); got != 0 {
		t.Fatal("client user should be deleted")
	}
	if got := countDocs(t, "ratings", bson.M{"from_user_id": client.UserID}); got != 0 {
		t.Fatal("client ratings should be deleted")
	}
	trainee, err := repositories.NewTraineeRepository().GetTraineeByID(traineeID)
	if err != nil {
		t.Fatalf("coach keeps their client record: %v", err)
	}
	if trainee.UserID != "" || strings.Contains(trainee.Email, "client") {
		t.Fatalf("client link and email should be removed: %+v", trainee)
	}
	trainerDoc, err := repositories.NewTrainerRepository().FindByUserID(trainer.UserID)
	if err != nil || trainerDoc.RatingCount != 0 {
		t.Fatalf("trainer rating should be recomputed without the deleted client: %v %+v", err, trainerDoc)
	}
}

func TestIntegrationCatalogSeededOnce(t *testing.T) {
	freshDB(t)
	trainer := newTrainer(t)
	traineeID := newTrainee(t, trainer) // seeds at creation

	cats := NewCategoryService()
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = cats.GetCategories(traineeID)
		}()
	}
	wg.Wait()
	if got := countDocs(t, "categories", bson.M{"trainee_id": traineeID}); got != 8 {
		t.Fatalf("categories = %d, want 8 (seeded once)", got)
	}

	// Deleting everything must not bring the defaults back.
	list, err := cats.GetCategories(traineeID)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range list {
		if err := cats.DeleteCategory(c.ID.Hex(), traineeID); err != nil {
			t.Fatal(err)
		}
	}
	after, err := cats.GetCategories(traineeID)
	if err != nil || len(after) != 0 {
		t.Fatalf("categories re-seeded after deletion: %v len=%d", err, len(after))
	}
}
