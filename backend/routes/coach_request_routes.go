package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterCoachRequestRoutes(router *gin.Engine) {
	ctrl := controllers.NewCoachRequestController()
	protected := router.Group("/coach_requests").Use(middlewares.AuthMiddleware())

	trainerOnly := middlewares.RequireRole(models.RoleTrainer)
	clientOnly := middlewares.RequireRole(models.RoleClient)

	protected.POST("", clientOnly, middlewares.RateLimitMiddleware(20, time.Hour, 5), ctrl.Create)
	protected.GET("/mine", clientOnly, ctrl.ListMine)
	protected.POST("/:id/cancel", clientOnly, ctrl.Cancel)

	protected.GET("", trainerOnly, ctrl.ListPending)
	protected.GET("/count", trainerOnly, ctrl.CountPending)
	protected.POST("/:id/accept", trainerOnly, ctrl.Accept)
	protected.POST("/:id/reject", trainerOnly, ctrl.Reject)
}
