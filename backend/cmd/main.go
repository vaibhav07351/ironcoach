package main

import (
	"ironcoach/database"
	"ironcoach/routes"
	"os"

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
	 routes.RegisterDietEntryRoutes(router)
	 routes.RegisterProgressRoutes(router)
	 routes.RegisterImageRoutes(router)

	router.GET("/",func(c *gin.Context){
		c.JSON(200, gin.H{
			"message":"Hello, Gym trainer App!",
		})
	})

	// Fetch the port from the environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port for local testing
	}

	// Start the server on the specified port
	router.Run(":" + port)
}