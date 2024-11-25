package routes

import (
	"ironcoach/controllers"
	"ironcoach/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterTrainerRoutes(router *gin.Engine){
	
	//Public routes
	trainerController := controllers.NewTrainerController()
	router.POST("/registerTrainer",trainerController.RegisterTrainer)

	router.POST("/login", trainerController.LoginTrainer)

	//Protected Routes
	protected := router.Group("/").Use(middlewares.AuthMiddleware())
	protected.GET("/profile", func(c *gin.Context){
		email := c.MustGet("email").(string)
		c.JSON(200, gin.H{"message": "Access granted", "email":email})
	})



	
}