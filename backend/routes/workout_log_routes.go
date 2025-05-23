package routes

import (
    "github.com/gin-gonic/gin"
    "ironcoach/controllers"
    "ironcoach/middlewares"
)

func RegisterWorkoutLogRoutes(router *gin.Engine) {
    workoutLogController := controllers.NewWorkoutLogController()

    protected := router.Group("/workout_logs").Use(middlewares.AuthMiddleware())

    protected.POST("", workoutLogController.AddWorkoutLog)
    protected.GET("/:trainee_id", workoutLogController.GetWorkoutLogs)
	protected.PUT("/:log_id", workoutLogController.UpdateWorkoutLog)
	protected.DELETE("/:log_id", workoutLogController.DeleteWorkoutLog)
	protected.GET("/:trainee_id/progress", workoutLogController.GetTraineeProgress)

}
