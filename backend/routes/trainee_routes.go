package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"

	"github.com/gin-gonic/gin"
)

// RegisterTraineeRoutes registers client (trainee) routes. Ownership is checked in the service.
func RegisterTraineeRoutes(router *gin.Engine) {
	traineeController := controllers.NewTraineeController()
	protected := router.Group("/trainees").Use(middlewares.AuthMiddleware())

	trainerOnly := middlewares.RequireRole(models.RoleTrainer)
	protected.POST("", trainerOnly, traineeController.AddTrainee)
	protected.POST("/", trainerOnly, traineeController.AddTrainee)
	protected.GET("", trainerOnly, traineeController.GetTrainees)
	protected.GET("/", trainerOnly, traineeController.GetTrainees)
	protected.GET("/:trainee_id", traineeController.GetTraineeByID)
	protected.PUT("/:id", traineeController.UpdateTrainee)
	protected.DELETE("/:id", trainerOnly, traineeController.DeleteTrainee)
}
