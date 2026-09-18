package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterCoachRequestRoutes(router *gin.Engine) {
	ctrl := controllers.NewCoachRequestController()
	protected := router.Group("/coach_requests").Use(middlewares.AuthMiddleware())

	protected.POST("", ctrl.Create)
	protected.GET("", ctrl.ListPending)
	protected.GET("/count", ctrl.CountPending)
	protected.POST("/:id/accept", ctrl.Accept)
	protected.POST("/:id/reject", ctrl.Reject)
}
