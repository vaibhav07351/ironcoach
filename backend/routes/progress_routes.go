package routes

import (
	"github.com/gin-gonic/gin"
	"ironcoach/controllers"
	"ironcoach/middlewares"
)

func RegisterProgressRoutes(router *gin.Engine) {
	progressController := controllers.NewProgressController()

	protected := router.Group("/progress").Use(middlewares.AuthMiddleware())

	protected.GET("/:trainee_id", progressController.GetProgress)
	protected.POST("/", progressController.AddWeightProgress)
}
