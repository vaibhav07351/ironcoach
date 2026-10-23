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
	accountController := controllers.NewAccountController()

	router.GET("/config", controllers.AppConfig)

	authGroup := router.Group("/")
	authGroup.Use(middlewares.RateLimitMiddleware(20, 15*time.Minute, 5))
	authGroup.POST("/auth/google", authController.GoogleAuth)

	protected := router.Group("/")
	protected.Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(200, time.Minute, 30))

	trainerOnly := middlewares.RequireRole(models.RoleTrainer)
	clientOnly := middlewares.RequireRole(models.RoleClient)

	protected.GET("/me", authController.Me)
	protected.DELETE("/me", middlewares.RateLimitMiddleware(5, time.Hour, 3), accountController.DeleteAccount)
	protected.PUT("/me/settings", authController.UpdateSettings)
	protected.POST("/me/leave-coach", clientOnly, accountController.LeaveCoach)

	protected.PUT("/auth/onboarding/trainer", trainerOnly, authController.CompleteTrainerOnboarding)
	protected.PUT("/auth/onboarding/trainer/expertise", trainerOnly, authController.CompleteTrainerExpertise)
	protected.PUT("/auth/interests", clientOnly, authController.UpdateClientInterests)

	protected.POST("/invites", trainerOnly, inviteController.CreateInvite)
	// Invite codes are short; a tight limit keeps guessing impractical.
	protected.POST("/invites/redeem", clientOnly, middlewares.RateLimitMiddleware(10, 15*time.Minute, 5), inviteController.RedeemInvite)

	protected.GET("/adherence/me", clientOnly, adherenceController.MyAdherence)
	protected.GET("/adherence/roster", trainerOnly, adherenceController.Roster)
	protected.GET("/adherence/trainees/:trainee_id", trainerOnly, middlewares.EnforceTraineeAccess("trainee_id"), adherenceController.TraineeAdherence)
}
