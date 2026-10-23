package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"

	"github.com/gin-gonic/gin"
)

// RegisterAttendanceRoutes registers attendance routes. Reads are open to the owning trainer and
// the linked client; marking is trainer-only. Ownership is checked in the service.
func RegisterAttendanceRoutes(router *gin.Engine) {
	ctrl := controllers.NewAttendanceController()
	trainerOnly := middlewares.RequireRole(models.RoleTrainer)

	group := router.Group("/attendance").Use(middlewares.AuthMiddleware())
	group.GET("/:trainee_id", ctrl.List)
	group.PUT("/:trainee_id/:date", trainerOnly, ctrl.Mark)
	group.DELETE("/:trainee_id/:date", trainerOnly, ctrl.Unmark)
}
