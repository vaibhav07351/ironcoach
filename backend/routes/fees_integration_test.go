package routes

// End-to-end HTTP tests for fees, attendance and the Today overview against a local MongoDB
// (see MONGODB_TEST_URI in routes_integration_test.go).

import (
	"context"
	"net/http"
	"testing"
	"time"

	"ironcoach/database"
	"ironcoach/middlewares"
	"ironcoach/models"
	"ironcoach/repositories"
	"ironcoach/services"
)

func asInt(v interface{}) int64 {
	f, _ := v.(float64)
	return int64(f)
}

func TestIntegrationFeesAttendanceToday(t *testing.T) {
	if database.DB == nil {
		t.Skip("MONGODB_TEST_URI not set; skipping integration test")
	}
	if err := database.Database().Drop(context.Background()); err != nil {
		t.Fatal(err)
	}
	repositories.EnsureIndexes()
	middlewares.Configure(services.NewAccessService())
	router, err := NewRouter(RouterConfig{RateLimitPerMinute: 10000, RateLimitBurst: 1000})
	if err != nil {
		t.Fatal(err)
	}

	coach := createUser(t, "coach@x.com", models.RoleTrainer)
	coach.router = router
	otherCoach := createUser(t, "other@x.com", models.RoleTrainer)
	otherCoach.router = router
	client := createUser(t, "client@x.com", models.RoleClient)
	client.router = router
	stranger := createUser(t, "stranger@x.com", models.RoleClient)
	stranger.router = router

	// Priya is linked to the app; Karan never installs it.
	code, body := coach.do(http.MethodPost, "/trainees", map[string]interface{}{"name": "Priya", "phone_number": "9876543210"})
	mustStatus(t, "add Priya", code, http.StatusCreated, body)
	priya, _ := body["id"].(string)
	code, body = coach.do(http.MethodPost, "/trainees", map[string]interface{}{"name": "Karan"})
	mustStatus(t, "add Karan", code, http.StatusCreated, body)
	karan, _ := body["id"].(string)

	code, body = coach.do(http.MethodPost, "/invites", map[string]interface{}{"trainee_id": priya})
	mustStatus(t, "invite", code, http.StatusOK, body)
	code, body = client.do(http.MethodPost, "/invites/redeem", map[string]interface{}{"code": body["code"], "share_consent": true})
	mustStatus(t, "redeem", code, http.StatusOK, body)

	// Selling a package: 12 sessions for 6000 rupees. A retry with the same client_id adds nothing.
	pkg := map[string]interface{}{"kind": "sessions", "sessions": 2, "amount_paise": 600000, "start_date": "2026-10-01", "client_id": "pkg-retry-0001"}
	code, body = coach.do(http.MethodPost, "/fees/"+priya+"/packages", pkg)
	mustStatus(t, "sell package", code, http.StatusCreated, body)
	code, body = coach.do(http.MethodPost, "/fees/"+priya+"/packages", pkg)
	mustStatus(t, "retry package", code, http.StatusOK, body)

	// Payment of 4000, retried once.
	pay := map[string]interface{}{"amount_paise": 400000, "date": "2026-10-02", "client_id": "pay-retry-0001"}
	code, body = coach.do(http.MethodPost, "/fees/"+priya+"/payments", pay)
	mustStatus(t, "record payment", code, http.StatusCreated, body)
	payID, _ := body["payment"].(map[string]interface{})["id"].(string)
	code, body = coach.do(http.MethodPost, "/fees/"+priya+"/payments", pay)
	mustStatus(t, "retry payment", code, http.StatusOK, body)

	// Attendance: marking twice leaves one record; two attended days use up the 2-session package.
	for _, d := range []string{"2026-10-03", "2026-10-03", "2026-10-04"} {
		code, body = coach.do(http.MethodPut, "/attendance/"+priya+"/"+d, nil)
		if code != http.StatusCreated && code != http.StatusOK {
			t.Fatalf("mark %s: %d %v", d, code, body)
		}
	}
	code, body = coach.do(http.MethodGet, "/attendance/"+priya, nil)
	mustStatus(t, "list attendance", code, http.StatusOK, body)
	if dates, _ := body["dates"].([]interface{}); len(dates) != 2 {
		t.Fatalf("attended days = %v, want 2", body["dates"])
	}

	// The summary: one package (used up), one payment, 2000 rupees due.
	code, body = coach.do(http.MethodGet, "/fees/"+priya, nil)
	mustStatus(t, "trainer reads fees", code, http.StatusOK, body)
	if asInt(body["total_paise"]) != 600000 || asInt(body["paid_paise"]) != 400000 || asInt(body["due_paise"]) != 200000 {
		t.Fatalf("money wrong: %v", body)
	}
	pkgs, _ := body["packages"].([]interface{})
	if len(pkgs) != 1 {
		t.Fatalf("packages = %v, want 1", pkgs)
	}
	first, _ := pkgs[0].(map[string]interface{})
	if asInt(first["sessions_used"]) != 2 || first["status"] != "used_up" {
		t.Fatalf("package usage wrong: %v", first)
	}
	if pays, _ := body["payments"].([]interface{}); len(pays) != 1 {
		t.Fatalf("payments = %v, want 1", pays)
	}

	// The linked client can read their own fees and attendance but not change anything.
	code, body = client.do(http.MethodGet, "/fees/"+priya, nil)
	mustStatus(t, "client reads own fees", code, http.StatusOK, body)
	code, body = client.do(http.MethodGet, "/attendance/"+priya, nil)
	mustStatus(t, "client reads own attendance", code, http.StatusOK, body)
	code, body = client.do(http.MethodPost, "/fees/"+priya+"/payments", pay)
	mustStatus(t, "client records payment", code, http.StatusForbidden, body)
	code, body = client.do(http.MethodPut, "/attendance/"+priya+"/2026-10-05", nil)
	mustStatus(t, "client marks attendance", code, http.StatusForbidden, body)
	code, body = client.do(http.MethodDelete, "/payments/"+payID, nil)
	mustStatus(t, "client deletes payment", code, http.StatusForbidden, body)
	code, body = client.do(http.MethodGet, "/today", nil)
	mustStatus(t, "client reads trainer today", code, http.StatusForbidden, body)

	// Other people cannot see or change this client's money.
	code, body = stranger.do(http.MethodGet, "/fees/"+priya, nil)
	mustStatus(t, "stranger reads fees", code, http.StatusForbidden, body)
	code, body = otherCoach.do(http.MethodGet, "/fees/"+priya, nil)
	mustStatus(t, "other coach reads fees", code, http.StatusForbidden, body)
	code, body = otherCoach.do(http.MethodPost, "/fees/"+priya+"/payments", pay)
	mustStatus(t, "other coach records payment", code, http.StatusForbidden, body)
	code, body = otherCoach.do(http.MethodPut, "/attendance/"+priya+"/2026-10-05", nil)
	mustStatus(t, "other coach marks attendance", code, http.StatusForbidden, body)
	code, body = otherCoach.do(http.MethodDelete, "/payments/"+payID, nil)
	mustStatus(t, "other coach deletes payment", code, http.StatusForbidden, body)

	// Validation: future attendance, bad amounts and unknown clients are refused.
	code, body = coach.do(http.MethodPut, "/attendance/"+priya+"/2099-01-01", nil)
	mustStatus(t, "future attendance", code, http.StatusUnprocessableEntity, body)
	code, body = coach.do(http.MethodPost, "/fees/"+priya+"/payments", map[string]interface{}{"amount_paise": -5})
	mustStatus(t, "negative payment", code, http.StatusUnprocessableEntity, body)
	code, body = coach.do(http.MethodPost, "/fees/not-an-id/payments", map[string]interface{}{"amount_paise": 100})
	mustStatus(t, "unknown client", code, http.StatusNotFound, body)

	// Today: Priya owes 2000 rupees and is on the dues list with her phone for the reminder.
	// The trainer has no time zone set, so "today" is a day in the default zone (Asia/Kolkata).
	ist, err := time.LoadLocation(services.DefaultTimezone)
	if err != nil {
		t.Fatal(err)
	}
	today := time.Now().In(ist).Format("2006-01-02")
	code, body = coach.do(http.MethodPut, "/attendance/"+karan+"/"+today, nil)
	mustStatus(t, "mark Karan today", code, http.StatusCreated, body)
	code, body = coach.do(http.MethodGet, "/today", nil)
	mustStatus(t, "today", code, http.StatusOK, body)
	if asInt(body["client_count"]) != 2 || asInt(body["dues_total_paise"]) != 200000 {
		t.Fatalf("today counts wrong: %v", body)
	}
	dues, _ := body["dues"].([]interface{})
	if len(dues) != 1 {
		t.Fatalf("dues = %v, want 1", dues)
	}
	if due, _ := dues[0].(map[string]interface{}); due["name"] != "Priya" || due["phone_number"] != "9876543210" {
		t.Fatalf("due item wrong: %v", due)
	}
	code, body = coach.do(http.MethodGet, "/dues", nil)
	mustStatus(t, "dues list", code, http.StatusOK, body)
	if asInt(body["count"]) != 1 || asInt(body["total_paise"]) != 200000 {
		t.Fatalf("dues list wrong: %v", body)
	}
	code, body = client.do(http.MethodGet, "/dues", nil)
	mustStatus(t, "client reads dues list", code, http.StatusForbidden, body)
	code, body = coach.do(http.MethodGet, "/today", nil)
	mustStatus(t, "today again", code, http.StatusOK, body)
	if attended, _ := body["attended_today"].([]interface{}); len(attended) != 1 {
		t.Fatalf("attended_today = %v, want Karan only", attended)
	}

	// Unmarking and deleting work, and the numbers follow.
	code, body = coach.do(http.MethodDelete, "/attendance/"+priya+"/2026-10-04", nil)
	mustStatus(t, "unmark", code, http.StatusNoContent, body)
	code, body = coach.do(http.MethodDelete, "/payments/"+payID, nil)
	mustStatus(t, "delete payment", code, http.StatusNoContent, body)
	code, body = coach.do(http.MethodGet, "/fees/"+priya, nil)
	mustStatus(t, "fees after delete", code, http.StatusOK, body)
	if asInt(body["due_paise"]) != 600000 {
		t.Fatalf("due after deleting payment = %v, want 600000", body["due_paise"])
	}
	first, _ = body["packages"].([]interface{})[0].(map[string]interface{})
	if asInt(first["sessions_left"]) != 1 {
		t.Fatalf("sessions_left after unmark = %v, want 1", first["sessions_left"])
	}

	// Deleting the client removes their money records too (no orphans).
	code, body = coach.do(http.MethodDelete, "/trainees/"+priya, nil)
	mustStatus(t, "delete client", code, http.StatusOK, body)
	for _, coll := range []string{"packages", "payments", "attendance"} {
		n, err := database.Database().Collection(coll).CountDocuments(context.Background(), map[string]interface{}{"trainee_id": priya})
		if err != nil || n != 0 {
			t.Fatalf("%s left behind after client delete: %d (%v)", coll, n, err)
		}
	}
}
