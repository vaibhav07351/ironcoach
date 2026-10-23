package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"

	"github.com/gin-gonic/gin"
)

// RegisterTodayRoutes registers the trainer Today overview and the dues list.
func RegisterTodayRoutes(router *gin.Engine) {
	ctrl := controllers.NewTodayController()
	trainerOnly := middlewares.RequireRole(models.RoleTrainer)
	router.GET("/today", middlewares.AuthMiddleware(), trainerOnly, ctrl.Overview)
	router.GET("/dues", middlewares.AuthMiddleware(), trainerOnly, ctrl.Dues)
}
