package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

// RegisterWorkoutLogRoutes registers workout log routes. Routes addressed by log id check
// ownership in the service (the log's trainee must belong to the caller).
func RegisterWorkoutLogRoutes(router *gin.Engine) {
	workoutLogController := controllers.NewWorkoutLogController()

	protected := router.Group("/workout_logs").Use(middlewares.AuthMiddleware())

	protected.POST("", workoutLogController.AddWorkoutLog)
	protected.GET("/:trainee_id", middlewares.EnforceTraineeAccess("trainee_id"), workoutLogController.GetWorkoutLogs)
	protected.PUT("/:log_id", workoutLogController.UpdateWorkoutLog)
	protected.DELETE("/:log_id", workoutLogController.DeleteWorkoutLog)
	protected.GET("/:trainee_id/progress", middlewares.EnforceTraineeAccess("trainee_id"), workoutLogController.GetTraineeProgress)
}
