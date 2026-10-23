package routes

import (
	"context"
	"ironcoach/database"
	"ironcoach/middlewares"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// RouterConfig holds the deployment-specific router settings.
type RouterConfig struct {
	TrustedProxies []string
	AllowedOrigins []string
	// RateLimitPerMinute and RateLimitBurst override the per-client request limits (zero keeps the
	// production defaults). Tests that make many requests in a row raise them.
	RateLimitPerMinute int
	RateLimitBurst     int
}

// NewRouter builds the HTTP router with all middleware and routes. Shared by main and the
// HTTP-level tests so they exercise exactly the production wiring.
func NewRouter(cfg RouterConfig) (*gin.Engine, error) {
	router := gin.New()
	router.Use(gin.Recovery())
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return nil, err
	}
	router.Use(middlewares.RequestContext())
	if len(cfg.AllowedOrigins) > 0 {
		router.Use(cors.New(cors.Config{
			AllowOrigins:     cfg.AllowedOrigins,
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
			ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
			AllowCredentials: true,
			MaxAge:           12 * time.Hour,
		}))
	}
	// JSON bodies are small; the upload route enforces its own 5 MB limit.
	router.Use(middlewares.LimitBody(1<<20, "/images/upload"))
	perMinute, burst := 150, 25
	if cfg.RateLimitPerMinute > 0 {
		perMinute = cfg.RateLimitPerMinute
	}
	if cfg.RateLimitBurst > 0 {
		burst = cfg.RateLimitBurst
	}
	router.Use(middlewares.RateLimitMiddleware(perMinute, time.Minute, burst))

	router.OPTIONS("/*path", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	RegisterAuthRoutes(router)
	RegisterTrainerRoutes(router)
	RegisterTraineeRoutes(router)
	RegisterWorkoutLogRoutes(router)
	RegisterCategoryRoutes(router)
	RegisterExerciseRoutes(router)
	RegisterDietEntryRoutes(router)
	RegisterProgressRoutes(router)
	RegisterImageRoutes(router)
	RegisterCoachRequestRoutes(router)
	RegisterRatingRoutes(router)
	RegisterNutritionRoutes(router)
	RegisterFeesRoutes(router)
	RegisterAttendanceRoutes(router)
	RegisterTodayRoutes(router)

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello, TrainerNearMe!"})
	})
	// Health check for uptime monitors and deploy smoke tests: verifies the database too.
	router.GET("/healthz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer cancel()
		if err := database.Ping(ctx); err != nil {
			slog.Error("health check: database ping failed", "err", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return router, nil
}
