package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterTrainerRoutes(router *gin.Engine) {
	trainerController := controllers.NewTrainerController()

	// REGISTRATION - Strict anti-spam protection
	registerGroup := router.Group("/")
	registerGroup.Use(middlewares.RateLimitMiddleware(5, time.Hour, 1))
	registerGroup.POST("/registerTrainer", trainerController.RegisterTrainer)

	// LOGIN - Prevent brute force but allow genuine retries
	loginGroup := router.Group("/")
	loginGroup.Use(middlewares.RateLimitMiddleware(10, 15*time.Minute, 3))
	loginGroup.POST("/login", trainerController.LoginTrainer)

	// PUBLIC READ - Normal limits
	publicGroup := router.Group("/")
	publicGroup.Use(middlewares.RateLimitMiddleware(60, time.Minute, 10))
	publicGroup.GET("/getTrainers", trainerController.GetTrainers)

	// PROTECTED - Higher limits for authenticated users
	protected := router.Group("/").Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(200, time.Minute, 30))
	
	protected.GET("/profile", func(c *gin.Context) {
		email := c.MustGet("email").(string)
		c.JSON(200, gin.H{"message": "Access granted", "email": email})
	})

	protected.GET("/getTrainerDetails", trainerController.GetTrainerDetails)
	protected.DELETE("/deleteTrainer/:email", trainerController.DeleteTrainer)
}