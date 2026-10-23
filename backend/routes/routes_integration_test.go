package routes

// End-to-end HTTP tests through the real router against a local MongoDB (MONGODB_TEST_URI).
// They drop their test database on that server, so only localhost URIs are accepted.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"
	"time"

	"ironcoach/database"
	"ironcoach/middlewares"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/services"
	"ironcoach/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestMain(m *testing.M) {
	if os.Getenv("JWT_SECRET") == "" {
		_ = os.Setenv("JWT_SECRET", "integration-test-secret")
	}
	gin.SetMode(gin.TestMode)
	if uri := os.Getenv("MONGODB_TEST_URI"); uri != "" {
		u, err := url.Parse(uri)
		if err != nil || u.Scheme != "mongodb" || (u.Hostname() != "localhost" && u.Hostname() != "127.0.0.1") {
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
		database.DBName = "ironcoach_test_routes"
	}
	os.Exit(m.Run())
}

type apiClient struct {
	t      *testing.T
	router http.Handler
	token  string
	userID string
}

func (a apiClient) do(method, path string, body interface{}) (int, map[string]interface{}) {
	a.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			a.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	if a.token != "" {
		req.Header.Set("Authorization", "Bearer "+a.token)
	}
	w := httptest.NewRecorder()
	a.router.ServeHTTP(w, req)

	out := map[string]interface{}{}
	if w.Body.Len() > 0 && w.Body.Bytes()[0] == '{' {
		_ = json.Unmarshal(w.Body.Bytes(), &out)
	}
	return w.Code, out
}

func mustStatus(t *testing.T, what string, got, want int, body map[string]interface{}) {
	t.Helper()
	if got != want {
		t.Fatalf("%s: status %d, want %d (body %v)", what, got, want, body)
	}
}

func createUser(t *testing.T, email, role string) apiClient {
	t.Helper()
	id := primitive.NewObjectID().Hex()
	u := models.User{ID: id, GoogleSub: "g-" + email, Email: email, Name: email, Role: role}
	if role == models.RoleTrainer {
		u.TrainerID = id
	}
	if _, err := repositories.NewUserRepository().Create(u); err != nil {
		t.Fatal(err)
	}
	if role == models.RoleTrainer {
		if err := services.NewTrainerService().RegisterTrainer(models.Trainer{UserID: id, Name: email, Email: email}); err != nil {
			t.Fatal(err)
		}
	}
	// Claims carry only identity; role/links are re-read from the database per request.
	tok, err := utils.GenerateAuthJWT(utils.Claims{Email: email, UserID: id, Role: role})
	if err != nil {
		t.Fatal(err)
	}
	return apiClient{t: t, token: tok, userID: id}
}

func TestIntegrationHTTPCoachingFlow(t *testing.T) {
	if database.DB == nil {
		t.Skip("MONGODB_TEST_URI not set; skipping integration test")
	}
	if err := database.Database().Drop(context.Background()); err != nil {
		t.Fatal(err)
	}
	repositories.EnsureIndexes()
	middlewares.Configure(services.NewAccessService())
	router, err := NewRouter(RouterConfig{})
	if err != nil {
		t.Fatal(err)
	}

	coach := createUser(t, "coach@x.com", models.RoleTrainer)
	coach.router = router
	client := createUser(t, "client@x.com", models.RoleClient)
	client.router = router
	stranger := createUser(t, "stranger@x.com", models.RoleClient)
	stranger.router = router
	otherCoach := createUser(t, "other@x.com", models.RoleTrainer)
	otherCoach.router = router

	// Trainer adds a client; a body trainer_id must be ignored.
	code, body := coach.do(http.MethodPost, "/trainees", map[string]interface{}{"name": "Asha", "trainer_id": "other@x.com", "user_id": "evil"})
	mustStatus(t, "add trainee", code, http.StatusCreated, body)
	traineeID, _ := body["id"].(string)

	code, body = otherCoach.do(http.MethodGet, "/trainees/"+traineeID, nil)
	mustStatus(t, "other coach reads client", code, http.StatusForbidden, body)

	code, list := coach.do(http.MethodGet, "/trainees", nil)
	mustStatus(t, "list trainees", code, http.StatusOK, list)

	// Clients cannot use trainer-only endpoints.
	code, body = client.do(http.MethodPost, "/trainees", map[string]interface{}{"name": "x"})
	mustStatus(t, "client adds trainee", code, http.StatusForbidden, body)

	// Invite and redeem.
	code, body = coach.do(http.MethodPost, "/invites", map[string]interface{}{"trainee_id": traineeID})
	mustStatus(t, "create invite", code, http.StatusOK, body)
	inviteCode, _ := body["code"].(string)

	code, body = client.do(http.MethodPost, "/invites/redeem", map[string]interface{}{"code": inviteCode})
	mustStatus(t, "redeem without consent", code, http.StatusUnprocessableEntity, body)
	code, body = client.do(http.MethodPost, "/invites/redeem", map[string]interface{}{"code": inviteCode, "share_consent": true})
	mustStatus(t, "redeem", code, http.StatusOK, body)

	// The client's ORIGINAL token (minted before linking) now works for their data.
	code, body = client.do(http.MethodGet, "/adherence/me", nil)
	mustStatus(t, "adherence with pre-link token", code, http.StatusOK, body)

	// Client logs a workout; a retry with the same client_id is not duplicated.
	logBody := map[string]interface{}{
		"trainee_id": traineeID, "date": "2026-10-12", "client_id": "retry-key-0001",
		"workouts": []map[string]interface{}{{"exercise": "Squats", "sets": 2, "reps": []int{10, 8}, "weight": []float64{60, 65}}},
	}
	code, body = client.do(http.MethodPost, "/workout_logs", logBody)
	mustStatus(t, "client logs workout", code, http.StatusCreated, body)
	logID, _ := body["log"].(map[string]interface{})["id"].(string)
	code, body = client.do(http.MethodPost, "/workout_logs", logBody)
	mustStatus(t, "retried log", code, http.StatusOK, body)

	// Mismatched sets are rejected instead of crashing progress later.
	bad := map[string]interface{}{"trainee_id": traineeID, "date": "2026-10-12",
		"workouts": []map[string]interface{}{{"exercise": "Squats", "sets": 3, "reps": []int{10}, "weight": []float64{60}}}}
	code, body = client.do(http.MethodPost, "/workout_logs", bad)
	mustStatus(t, "mismatched sets", code, http.StatusUnprocessableEntity, body)

	// A stranger cannot touch the log by id.
	code, body = stranger.do(http.MethodDelete, "/workout_logs/"+logID, nil)
	mustStatus(t, "stranger deletes log", code, http.StatusForbidden, body)
	code, body = stranger.do(http.MethodGet, "/workout_logs/"+traineeID, nil)
	mustStatus(t, "stranger lists logs", code, http.StatusForbidden, body)

	// Trainer sees the log and the progress summary.
	code, _ = coach.do(http.MethodGet, "/workout_logs/"+traineeID+"?date=2026-10-12", nil)
	mustStatus(t, "trainer lists logs", code, http.StatusOK, nil)
	code, body = coach.do(http.MethodGet, "/progress/"+traineeID, nil)
	mustStatus(t, "progress", code, http.StatusOK, body)

	// Client cannot change coach-only fields, but can edit their own goals.
	code, body = client.do(http.MethodPut, "/trainees/"+traineeID, map[string]interface{}{"goals": "10k run", "notes": "client wrote this", "active_status": false})
	mustStatus(t, "client edits own record", code, http.StatusOK, body)
	code, body = coach.do(http.MethodGet, "/trainees/"+traineeID, nil)
	mustStatus(t, "coach reads client", code, http.StatusOK, body)
	if body["goals"] != "10k run" || body["notes"] == "client wrote this" || body["active_status"] != true {
		t.Fatalf("client edit leaked into coach-only fields: %v", body)
	}

	// Client leaves; their access ends immediately.
	code, body = client.do(http.MethodPost, "/me/leave-coach", nil)
	mustStatus(t, "leave coach", code, http.StatusOK, body)
	code, body = client.do(http.MethodGet, "/workout_logs/"+traineeID, nil)
	mustStatus(t, "access after leaving", code, http.StatusForbidden, body)

	// Account deletion needs explicit confirmation, then the token stops working.
	code, body = coach.do(http.MethodDelete, "/me", map[string]interface{}{})
	mustStatus(t, "delete without confirm", code, http.StatusBadRequest, body)
	code, body = coach.do(http.MethodDelete, "/me", map[string]interface{}{"confirm": "DELETE"})
	mustStatus(t, "delete account", code, http.StatusOK, body)
	code, body = coach.do(http.MethodGet, "/me", nil)
	mustStatus(t, "token after deletion", code, http.StatusUnauthorized, body)
}

// doRaw performs a request and returns the status and raw body (for array responses).
func (a apiClient) doRaw(method, path string, body interface{}) (int, []byte) {
	a.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			a.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.token)
	w := httptest.NewRecorder()
	a.router.ServeHTTP(w, req)
	return w.Code, w.Body.Bytes()
}

func TestIntegrationHTTPDiscoveryRequestsAndSettings(t *testing.T) {
	if database.DB == nil {
		t.Skip("MONGODB_TEST_URI not set; skipping integration test")
	}
	if err := database.Database().Drop(context.Background()); err != nil {
		t.Fatal(err)
	}
	repositories.EnsureIndexes()
	middlewares.Configure(services.NewAccessService())
	router, err := NewRouter(RouterConfig{})
	if err != nil {
		t.Fatal(err)
	}
	coach := createUser(t, "disc-coach@x.com", models.RoleTrainer)
	coach.router = router
	client := createUser(t, "disc-client@x.com", models.RoleClient)
	client.router = router

	// Coach publishes an exact location; validation rejects nonsense first.
	code, body := coach.do(http.MethodPut, "/trainers/me/discovery", map[string]interface{}{"latitude": 123.0, "longitude": 77.5})
	mustStatus(t, "invalid latitude", code, http.StatusUnprocessableEntity, body)
	code, body = coach.do(http.MethodPut, "/trainers/me/discovery", map[string]interface{}{
		"latitude": 12.971598, "longitude": 77.594566, "city": "Bengaluru", "discovery_visible": true, "expertises": []string{"gym"},
	})
	mustStatus(t, "update profile", code, http.StatusOK, body)

	code, raw := client.doRaw(http.MethodGet, "/trainers/discover?lat=12.9&lng=77.6", nil)
	if code != http.StatusOK {
		t.Fatalf("discover: %d %s", code, raw)
	}
	var items []map[string]interface{}
	if err := json.Unmarshal(raw, &items); err != nil || len(items) != 1 {
		t.Fatalf("discover items: %v %s", err, raw)
	}
	item := items[0]
	if item["id"] != coach.userID {
		t.Fatalf("discover id = %v, want trainer user id", item["id"])
	}
	if _, leaked := item["email"]; leaked {
		t.Fatal("discover must not expose trainer email")
	}
	if item["latitude"] != 12.97 || item["longitude"] != 77.59 {
		t.Fatalf("coordinates must be rounded to ~1 km: %v,%v", item["latitude"], item["longitude"])
	}

	// Request by trainer id, see it in "mine", coach accepts, client rates the coach.
	code, body = client.do(http.MethodPost, "/coach_requests", map[string]interface{}{"trainer_id": coach.userID})
	mustStatus(t, "request without consent", code, http.StatusUnprocessableEntity, body)
	code, body = client.do(http.MethodPost, "/coach_requests", map[string]interface{}{"trainer_id": coach.userID, "share_consent": true})
	mustStatus(t, "request coach", code, http.StatusOK, body)
	requestID, _ := body["id"].(string)
	code, raw = client.doRaw(http.MethodGet, "/coach_requests/mine", nil)
	if code != http.StatusOK || !bytes.Contains(raw, []byte(`"trainer_name":"disc-coach@x.com"`)) {
		t.Fatalf("mine: %d %s", code, raw)
	}
	code, body = coach.do(http.MethodPost, "/coach_requests/"+requestID+"/accept", nil)
	mustStatus(t, "accept", code, http.StatusOK, body)

	code, body = client.do(http.MethodGet, "/me", nil)
	mustStatus(t, "me", code, http.StatusOK, body)
	if body["trainer_id"] != coach.userID || body["timezone"] != "Asia/Kolkata" {
		t.Fatalf("client should be linked by trainer id with default timezone: %v", body)
	}
	code, body = client.do(http.MethodPut, "/ratings", map[string]interface{}{"to_kind": "trainer", "to_id": coach.userID, "score": 4.5})
	mustStatus(t, "rate coach", code, http.StatusOK, body)
	code, body = coach.do(http.MethodGet, "/getTrainerDetails", nil)
	mustStatus(t, "trainer profile", code, http.StatusOK, body)
	if body["rating"] != 4.5 || body["id"] != coach.userID {
		t.Fatalf("rating not applied to the trainer profile: %v", body)
	}

	// Time zone setting.
	code, body = client.do(http.MethodPut, "/me/settings", map[string]interface{}{"timezone": "Mars/Base"})
	mustStatus(t, "bad timezone", code, http.StatusUnprocessableEntity, body)
	code, body = client.do(http.MethodPut, "/me/settings", map[string]interface{}{"timezone": "Asia/Dubai"})
	mustStatus(t, "set timezone", code, http.StatusOK, body)
	if body["timezone"] != "Asia/Dubai" {
		t.Fatalf("timezone not saved: %v", body)
	}

	// Logging far in the future is rejected.
	code, body = client.do(http.MethodGet, "/me", nil)
	traineeID, _ := body["trainee_id"].(string)
	code, body = client.do(http.MethodPost, "/progress", map[string]interface{}{"trainee_id": traineeID, "date": "2099-01-01", "weight": 70})
	mustStatus(t, "future weight", code, http.StatusUnprocessableEntity, body)
}
