package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterRatingRoutes(router *gin.Engine) {
	ctrl := controllers.NewRatingController()
	protected := router.Group("/ratings").Use(middlewares.AuthMiddleware())

	protected.PUT("", ctrl.Upsert)
	protected.GET("/mine", ctrl.Mine)
}
