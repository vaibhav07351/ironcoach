package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterExerciseRoutes(router *gin.Engine) {
	exerciseController := controllers.NewExerciseController()
	protected := router.Group("/exercises").Use(middlewares.AuthMiddleware())

	protected.POST("", exerciseController.AddExercise)
	protected.GET("/category/:category_id", exerciseController.GetExercisesByCategory)
	protected.GET("/search", exerciseController.SearchExercises)
	protected.PUT("/:id", exerciseController.UpdateExercise)
	protected.DELETE("/:id", exerciseController.DeleteExercise)
}
