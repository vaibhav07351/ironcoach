package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

// RegisterExerciseLogRoutes registers the per-exercise logging routes. Every route is scoped to a
// trainee the caller may access; the service also checks the exercise is in that trainee's catalog.
func RegisterExerciseLogRoutes(router *gin.Engine) {
	ctrl := controllers.NewExerciseLogController()

	group := router.Group("/exercise_logs/:trainee_id/:exercise_id").
		Use(middlewares.AuthMiddleware(), middlewares.EnforceTraineeAccess("trainee_id"))

	group.GET("/day/:date", ctrl.GetDay)
	group.PUT("/day/:date", ctrl.SaveDay)
	group.GET("/history", ctrl.History)
	group.GET("/stats", ctrl.Stats)

	// Activity mix lives next to the trainee's other workout-log reads.
	router.GET("/workout_logs/:trainee_id/activity_mix",
		middlewares.AuthMiddleware(), middlewares.EnforceTraineeAccess("trainee_id"), ctrl.ActivityMix)
	router.GET("/workout_logs/:trainee_id/dates",
		middlewares.AuthMiddleware(), middlewares.EnforceTraineeAccess("trainee_id"), ctrl.LoggedDates)
}
