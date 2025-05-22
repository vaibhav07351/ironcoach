package main

import (
	"ironcoach/database"
	"ironcoach/routes"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	database.ConnectDB()

	router := gin.Default()

	// Use official CORS middleware (handles all cases safely)
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"https://ironcoach--nuhvn6qnqp.expo.app",
			"http://localhost:8081",
			"https://ironcoach--ironcoach-staging.expo.app",
			"https://ironcoach.expo.app",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	//  This line handles all OPTIONS preflight requests
	router.OPTIONS("/*path", func(c *gin.Context) {
		c.Status(204)
	})
	
	// Register routes
	routes.RegisterTrainerRoutes(router)
	routes.RegisterTraineeRoutes(router)
	routes.RegisterWorkoutLogRoutes(router)
	routes.RegisterCategoryRoutes(router)
	routes.RegisterExerciseRoutes(router)
	routes.RegisterDietEntryRoutes(router)
	routes.RegisterProgressRoutes(router)
	routes.RegisterImageRoutes(router)

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello, Gym trainer App!",
		})
	})

	// Fetch port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router.Run(":" + port)
}
