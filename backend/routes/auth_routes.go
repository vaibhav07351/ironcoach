package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(router *gin.Engine) {
	authController := controllers.NewAuthController()
	inviteController := controllers.NewInviteController()
	adherenceController := controllers.NewAdherenceController()

	authGroup := router.Group("/")
	authGroup.Use(middlewares.RateLimitMiddleware(20, 15*time.Minute, 5))
	authGroup.POST("/auth/google", authController.GoogleAuth)

	protected := router.Group("/")
	protected.Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(200, time.Minute, 30))

	protected.GET("/me", authController.Me)
	protected.PUT("/auth/onboarding/trainer", authController.CompleteTrainerOnboarding)

	protected.POST("/invites", middlewares.RequireRole(models.RoleTrainer), inviteController.CreateInvite)
	protected.POST("/invites/redeem", middlewares.RequireRole(models.RoleClient), inviteController.RedeemInvite)

	protected.GET("/adherence/me", middlewares.RequireRole(models.RoleClient), adherenceController.MyAdherence)
	protected.GET("/adherence/roster", middlewares.RequireRole(models.RoleTrainer), adherenceController.Roster)
	protected.GET("/adherence/trainees/:trainee_id", middlewares.RequireRole(models.RoleTrainer), adherenceController.TraineeAdherence)
}
