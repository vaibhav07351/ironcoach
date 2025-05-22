package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterCategoryRoutes(router *gin.Engine) {
	categoryController := controllers.NewCategoryController()
    protected := router.Group("/categories").Use(middlewares.AuthMiddleware())

    protected.POST("",categoryController.AddCategory)
    protected.GET("", categoryController.GetCategories)
    protected.PUT("/:id", categoryController.UpdateCategory)
    protected.DELETE("/:id", categoryController.DeleteCategory)
}

