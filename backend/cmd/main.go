package main

import (
	"ironcoach/database"
	"ironcoach/routes"

	"github.com/gin-gonic/gin"
)

func main(){

	database.ConnectDB()
	
	router:=gin.Default()
	 // Register trainer routes
	 routes.RegisterTrainerRoutes(router)
	 routes.RegisterTraineeRoutes(router)
	 routes.RegisterWorkoutLogRoutes(router)
	 routes.RegisterCategoryRoutes(router)
	 routes.RegisterExerciseRoutes(router)
	
	router.GET("/",func(c *gin.Context){
		c.JSON(200, gin.H{
			"message":"Hello, Gym trainer App!",
		})
	})

	router.Run(":8080")
}