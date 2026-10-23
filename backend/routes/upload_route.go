package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"
	"time"

	"github.com/gin-gonic/gin"
)

func RegisterImageRoutes(router *gin.Engine) {
	imageController := controllers.NewImageController()

	protected := router.Group("/images").Use(middlewares.AuthMiddleware())
	protected.Use(middlewares.RateLimitMiddleware(30, time.Hour, 5))
	protected.POST("/upload", imageController.UploadImage)
}
