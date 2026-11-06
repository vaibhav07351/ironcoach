package routes

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ironcoach/database"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// TestRouterBuildsAndGuardsNewRoutes builds the full router (Gin panics on conflicting paths) and
// checks the exercise, body and progress routes reject unauthenticated calls. It needs no
// database: when none is configured, a client that never connects stands in.
func TestRouterBuildsAndGuardsNewRoutes(t *testing.T) {
	if database.DB == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://127.0.0.1:1").SetServerSelectionTimeout(time.Second))
		if err != nil {
			t.Fatal(err)
		}
		database.DB = client
		t.Cleanup(func() {
			_ = client.Disconnect(context.Background())
			database.DB = nil
		})
	}

	router, err := NewRouter(RouterConfig{RateLimitPerMinute: 10000, RateLimitBurst: 1000})
	if err != nil {
		t.Fatal(err)
	}

	paths := []struct{ method, path string }{
		{http.MethodGet, "/exercise_logs/t1/e1/day/2026-11-03"},
		{http.MethodPut, "/exercise_logs/t1/e1/day/2026-11-03"},
		{http.MethodGet, "/exercise_logs/t1/e1/history"},
		{http.MethodGet, "/exercise_logs/t1/e1/stats"},
		{http.MethodGet, "/workout_logs/t1/activity_mix"},
		{http.MethodGet, "/workout_logs/t1/dates?from=2026-11-01&to=2026-11-30"},
		{http.MethodGet, "/exercises/search?trainee_id=t1"},
		{http.MethodPost, "/body_measurements"},
		{http.MethodGet, "/body_measurements/t1/summary"},
		{http.MethodGet, "/body_measurements/t1/series?metric=waist"},
		{http.MethodDelete, "/body_measurements/t1/waist/2026-11-03"},
		{http.MethodGet, "/progress/t1/summary"},
		{http.MethodGet, "/progress/t1/compare?from=2026-05-01&to=2026-11-01"},
	}
	for _, p := range paths {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(p.method, p.path, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without a token = %d, want 401", p.method, p.path, rec.Code)
		}
	}
}
