package routes

import (
    "github.com/gin-gonic/gin"
    "ironcoach/controllers"
    "ironcoach/middlewares"
)

func RegisterTraineeRoutes(router *gin.Engine) {
    traineeController := controllers.NewTraineeController()
    protected := router.Group("/trainees").Use(middlewares.AuthMiddleware())

    protected.POST("", traineeController.AddTrainee)
    protected.POST("/", traineeController.AddTrainee)
    protected.GET("", traineeController.GetTrainees)
    protected.GET("/", traineeController.GetTrainees)
    protected.GET("/:trainee_id", traineeController.GetTraineeByID)
    protected.PUT("/:id", traineeController.UpdateTrainee)
    protected.DELETE("/:id", traineeController.DeleteTrainee)
}
