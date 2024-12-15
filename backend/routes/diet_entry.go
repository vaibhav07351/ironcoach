package routes

import (
    "github.com/gin-gonic/gin"
    "ironcoach/controllers"
    "ironcoach/middlewares"
)

func RegisterDietEntryRoutes(router *gin.Engine) {
    dietEntryController := controllers.NewDietEntryController()

    protected := router.Group("/diet_entries").Use(middlewares.AuthMiddleware())

    protected.POST("/", dietEntryController.AddDietEntry)
    protected.GET("/:trainee_id", dietEntryController.GetDietEntries)
    protected.PUT("/:entry_id", dietEntryController.UpdateDietEntry)
    protected.DELETE("/:entry_id", dietEntryController.DeleteDietEntry)
}
