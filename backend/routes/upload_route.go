package routes

import (
    "github.com/gin-gonic/gin"
    "ironcoach/controllers"
)

func RegisterImageRoutes(router *gin.Engine) {
    imageController := controllers.NewImageController()

    protected := router.Group("/images") // Add authentication middleware if needed
    protected.POST("/upload", imageController.UploadImage)
}
