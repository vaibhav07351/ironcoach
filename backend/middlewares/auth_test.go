package middlewares

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"ironcoach/models"
	"ironcoach/services"
	"ironcoach/utils"

	"github.com/gin-gonic/gin"
)

// fakeAuth resolves principals from an in-memory map (user id -> principal).
type fakeAuth struct {
	users    map[string]services.Principal
	failWith error
}

func (f fakeAuth) ResolvePrincipal(userID string) (services.Principal, error) {
	if f.failWith != nil {
		return services.Principal{}, f.failWith
	}
	p, ok := f.users[userID]
	if !ok {
		return services.Principal{}, services.ErrUnauthorized("account_not_found", "account not found")
	}
	return p, nil
}

func (f fakeAuth) AuthorizeTrainee(p services.Principal, traineeID string) (models.Trainee, error) {
	if p.TraineeID == traineeID {
		return models.Trainee{ID: traineeID}, nil
	}
	return models.Trainee{}, services.ErrForbidden("no access")
}

func setupAuthTest(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	if os.Getenv("JWT_SECRET") == "" {
		t.Setenv("JWT_SECRET", "test-secret")
	}
}

func sign(t *testing.T, c utils.Claims) string {
	t.Helper()
	tok, err := utils.GenerateAuthJWT(c)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return tok
}

func TestAuthMiddleware(t *testing.T) {
	setupAuthTest(t)
	Configure(fakeAuth{users: map[string]services.Principal{
		"u1": {UserID: "u1", Role: models.RoleTrainer, TrainerKey: "a@b.com"},
		"u2": {UserID: "u2", Role: models.RoleClient, TraineeID: "t2"},
	}})

	cases := []struct {
		name   string
		header string
		want   int
	}{
		{"missing token", "", http.StatusUnauthorized},
		{"garbage token", "Bearer not-a-jwt", http.StatusUnauthorized},
		{"legacy token without user_id", sign(t, utils.Claims{Email: "a@b.com", Role: "trainer"}), http.StatusUnauthorized},
		{"token without role", sign(t, utils.Claims{Email: "a@b.com", UserID: "u1"}), http.StatusUnauthorized},
		{"deleted account", sign(t, utils.Claims{Email: "x@b.com", UserID: "gone", Role: "client"}), http.StatusUnauthorized},
		{"valid trainer token, raw", sign(t, utils.Claims{Email: "a@b.com", UserID: "u1", Role: "trainer"}), http.StatusOK},
		{"valid client token, bearer", "Bearer " + sign(t, utils.Claims{Email: "c@b.com", UserID: "u2", Role: "client"}), http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := gin.New()
			r.GET("/x", AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
			req := httptest.NewRequest(http.MethodGet, "/x", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Fatalf("got %d, want %d (body %s)", w.Code, tc.want, w.Body.String())
			}
		})
	}
}

// Role and links come from the database, not the token: a client token whose user is now a
// trainer in the DB (or whose link changed) gets the current values.
func TestAuthMiddlewareUsesDatabaseState(t *testing.T) {
	setupAuthTest(t)
	Configure(fakeAuth{users: map[string]services.Principal{
		"u2": {UserID: "u2", Role: models.RoleClient, TraineeID: "t-new"},
	}})

	r := gin.New()
	r.GET("/x", AuthMiddleware(), func(c *gin.Context) {
		c.String(http.StatusOK, CurrentPrincipal(c).TraineeID)
	})
	// Token minted before the client linked (empty trainee_id).
	tok := sign(t, utils.Claims{Email: "c@b.com", UserID: "u2", Role: "client"})
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK || w.Body.String() != "t-new" {
		t.Fatalf("got %d %q, want 200 t-new", w.Code, w.Body.String())
	}
}

func TestAuthMiddlewareDatabaseDown(t *testing.T) {
	setupAuthTest(t)
	Configure(fakeAuth{failWith: errors.New("connection refused")})

	r := gin.New()
	r.GET("/x", AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusOK) })
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", sign(t, utils.Claims{UserID: "u1", Role: "trainer"}))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d, want 503", w.Code)
	}
}

func TestEnforceTraineeAccessAndRoles(t *testing.T) {
	setupAuthTest(t)
	Configure(fakeAuth{users: map[string]services.Principal{
		"u2": {UserID: "u2", Role: models.RoleClient, TraineeID: "t2"},
	}})
	tok := sign(t, utils.Claims{UserID: "u2", Role: "client"})

	r := gin.New()
	r.GET("/t/:trainee_id", AuthMiddleware(), EnforceTraineeAccess("trainee_id"), func(c *gin.Context) { c.Status(http.StatusOK) })
	r.GET("/trainer-only", AuthMiddleware(), RequireRole(models.RoleTrainer), func(c *gin.Context) { c.Status(http.StatusOK) })

	for path, want := range map[string]int{
		"/t/t2":         http.StatusOK,
		"/t/t-other":    http.StatusForbidden,
		"/trainer-only": http.StatusForbidden,
	} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", tok)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != want {
			t.Errorf("%s: got %d, want %d", path, w.Code, want)
		}
	}
}
