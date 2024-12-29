package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Client

func ConnectDB() {
   // Load environment variables based on the environment
	env := os.Getenv("ENV") // Check for the ENV variable
	if env != "production" {
		// Load the .env file in non-production environments
		err := godotenv.Load("../../.env")
		if err != nil {
			log.Fatalf("Error loading .env file: %v", err)
		}
		fmt.Println("Loaded .env file for development")
	} else {
		fmt.Println("Running in production mode, skipping .env file")
	}

    // Get MongoDB URI from environment variables
    mongoURI := os.Getenv("MONGODB_URI")
    if mongoURI == "" {
        log.Fatal("MONGODB_URI is not set in the environment variables")
    }

    // Set up MongoDB client options
    clientOptions := options.Client().ApplyURI(mongoURI)

    // Create a context with a timeout
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Connect to MongoDB
    client, err := mongo.Connect(ctx, clientOptions)
    if err != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", err)
    }

    // Check the connection
    if err := client.Ping(ctx, nil); err != nil {
        log.Fatalf("Failed to ping MongoDB: %v", err)
    }

    // Save the client
    DB = client
    log.Println("Connected to MongoDB!")
}
