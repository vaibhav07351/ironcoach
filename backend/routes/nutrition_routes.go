package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterNutritionRoutes(router *gin.Engine) {
	ctrl := controllers.NewNutritionController()
	protected := router.Group("/")
	protected.Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(60, time.Minute, 20))
	protected.GET("/nutrition/search", ctrl.Search)
}
