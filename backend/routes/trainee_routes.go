package routes

import (
	"github.com/gin-gonic/gin"
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"
)

func RegisterTraineeRoutes(router *gin.Engine) {
	traineeController := controllers.NewTraineeController()
	protected := router.Group("/trainees").Use(middlewares.AuthMiddleware())

	protected.POST("", middlewares.RequireRole(models.RoleTrainer), traineeController.AddTrainee)
	protected.POST("/", middlewares.RequireRole(models.RoleTrainer), traineeController.AddTrainee)
	protected.GET("", middlewares.RequireRole(models.RoleTrainer), traineeController.GetTrainees)
	protected.GET("/", middlewares.RequireRole(models.RoleTrainer), traineeController.GetTrainees)
	protected.GET("/:trainee_id", middlewares.EnforceTraineeAccess("trainee_id"), traineeController.GetTraineeByID)
	protected.PUT("/:id", middlewares.EnforceTraineeAccess("id"), traineeController.UpdateTrainee)
	protected.DELETE("/:id", middlewares.RequireRole(models.RoleTrainer), middlewares.EnforceTraineeAccess("id"), traineeController.DeleteTrainee)
}
