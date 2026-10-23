package middlewares

import (
	"ironcoach/models"
	"ironcoach/services"
	"ironcoach/utils"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Authenticator resolves the caller and authorizes trainee access. It is configured once at
// startup (services.AccessService) and replaced with a fake in tests.
type Authenticator interface {
	ResolvePrincipal(userID string) (services.Principal, error)
	AuthorizeTrainee(p services.Principal, traineeID string) (models.Trainee, error)
}

var authenticator Authenticator

// Configure sets the authenticator used by AuthMiddleware and the trainee access checks.
func Configure(a Authenticator) { authenticator = a }

const principalKey = "principal"

// AuthMiddleware verifies the JWT, then loads the caller's current role and links from the
// database. Token claims are only trusted for the user id, so unlinking, deleting a client
// or deleting the account takes effect immediately instead of when the token expires.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
		if tokenString == "" {
			abortJSON(c, http.StatusUnauthorized, "token_missing", "sign in required")
			return
		}

		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			abortJSON(c, http.StatusUnauthorized, "token_invalid", "session expired, please sign in again")
			return
		}

		// Tokens from the removed email/password login carry no user_id or role; reject them so
		// they cannot be used until they expire.
		if claims.UserID == "" || (claims.Role != models.RoleTrainer && claims.Role != models.RoleClient) {
			abortJSON(c, http.StatusUnauthorized, "token_outdated", "please sign in again")
			return
		}

		if authenticator == nil {
			slog.Error("auth middleware not configured", "request_id", RequestID(c))
			abortJSON(c, http.StatusInternalServerError, "server_misconfigured", "something went wrong, please try again")
			return
		}
		p, err := authenticator.ResolvePrincipal(claims.UserID)
		if err != nil {
			if services.IsKind(err, services.KindUnauthorized) {
				abortJSON(c, http.StatusUnauthorized, "account_not_found", "account not found, please sign in again")
				return
			}
			slog.Error("resolve principal failed", "request_id", RequestID(c), "user_id", claims.UserID, "err", err)
			abortJSON(c, http.StatusServiceUnavailable, "auth_unavailable", "please try again in a moment")
			return
		}

		c.Set(principalKey, p)
		// user_id is also kept as a plain value for request logging.
		c.Set("user_id", p.UserID)

		c.Next()
	}
}

// CurrentPrincipal returns the caller set by AuthMiddleware (zero value if unauthenticated).
func CurrentPrincipal(c *gin.Context) services.Principal {
	v, ok := c.Get(principalKey)
	if !ok {
		return services.Principal{}
	}
	p, _ := v.(services.Principal)
	return p
}

// RequireRole aborts unless the caller's role matches one of the allowed roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		if !allowed[CurrentPrincipal(c).Role] {
			abortJSON(c, http.StatusForbidden, "forbidden", "this action is not available for your account type")
			return
		}
		c.Next()
	}
}

func abortJSON(c *gin.Context, status int, code, msg string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": msg}})
}
