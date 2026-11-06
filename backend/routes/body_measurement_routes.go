package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

// RegisterBodyMeasurementRoutes registers the Body tracker routes. Reads are scoped by the
// trainee access middleware; writes authorize the trainee in the service.
func RegisterBodyMeasurementRoutes(router *gin.Engine) {
	ctrl := controllers.NewBodyMeasurementController()

	protected := router.Group("/body_measurements").Use(middlewares.AuthMiddleware())

	protected.POST("", ctrl.Record)
	protected.GET("/:trainee_id/summary", middlewares.EnforceTraineeAccess("trainee_id"), ctrl.Summary)
	protected.GET("/:trainee_id/series", middlewares.EnforceTraineeAccess("trainee_id"), ctrl.Series)
	protected.DELETE("/:trainee_id/:metric/:date", ctrl.Delete)
}
