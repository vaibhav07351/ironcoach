package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"time"

	"github.com/gin-gonic/gin"
)

// RegisterTrainerRoutes registers trainer profile and discovery routes.
// Legacy email/password routes (/registerTrainer, /login), the public /getTrainers dump and the
// hardcoded-admin /deleteTrainer route were removed: Google sign-in (/auth/google) is the only
// way to create or access a trainer account.
func RegisterTrainerRoutes(router *gin.Engine) {
	trainerController := controllers.NewTrainerController()

	protected := router.Group("/").Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(200, time.Minute, 30))

	protected.GET("/getTrainerDetails", trainerController.GetTrainerDetails)
	protected.PUT("/trainers/me/discovery", trainerController.UpdateDiscoveryProfile)
	protected.GET("/trainers/discover", trainerController.DiscoverTrainers)
}
