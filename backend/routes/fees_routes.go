package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"ironcoach/models"

	"github.com/gin-gonic/gin"
)

// RegisterFeesRoutes registers fee, package and payment routes. Reads are open to the owning
// trainer and the linked client; writes are trainer-only. Ownership is checked in the service.
func RegisterFeesRoutes(router *gin.Engine) {
	ctrl := controllers.NewFeesController()
	trainerOnly := middlewares.RequireRole(models.RoleTrainer)

	fees := router.Group("/fees").Use(middlewares.AuthMiddleware())
	fees.GET("/:trainee_id", ctrl.Summary)
	fees.POST("/:trainee_id/packages", trainerOnly, ctrl.AddPackage)
	fees.POST("/:trainee_id/payments", trainerOnly, ctrl.AddPayment)

	router.DELETE("/packages/:package_id", middlewares.AuthMiddleware(), trainerOnly, ctrl.DeletePackage)
	router.DELETE("/payments/:payment_id", middlewares.AuthMiddleware(), trainerOnly, ctrl.DeletePayment)
}
