package middlewares

import (
	"ironcoach/models"
	"ironcoach/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowedOrigins := map[string]bool{
			"https://ironcoach--ctsjgkrhrb.expo.app":     true,
			"https://ironcoach--nuhvn6qnqp.expo.app":     true,
			"https://ironcoach--ironcoach-staging.expo.app": true,
			"https://ironcoach.expo.app":                true,
			"http://localhost:8081":                     true,
			"http://localhost:8080":                     true,
		}
		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization token required"})
			return
		}
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		tokenString = strings.TrimSpace(tokenString)

		claims, err := utils.VerifyJWT(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set("email", claims.Email)
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Set("trainer_id", claims.TrainerID)
		c.Set("trainee_id", claims.TraineeID)

		// Legacy tokens without role are treated as trainers (email/password era)
		if claims.Role == "" {
			c.Set("role", models.RoleTrainer)
		}

		c.Next()
	}
}

// RequireRole aborts unless the JWT role matches one of the allowed roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		roleStr, _ := role.(string)
		if !allowed[roleStr] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "forbidden", "message": "insufficient role"},
			})
			return
		}
		c.Next()
	}
}
