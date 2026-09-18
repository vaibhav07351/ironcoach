package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var DB *mongo.Client

// LoadEnv loads .env for non-production from the working directory (or backend/).
func LoadEnv() {
	if os.Getenv("ENV") == "production" {
		log.Println("Running in production mode, skipping .env file")
		return
	}

	wd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Could not determine working directory: %v", err)
	}

	candidates := []string{
		filepath.Join(wd, ".env"),
		filepath.Join(wd, "backend", ".env"),
		filepath.Join(wd, "..", "backend", ".env"),
	}

	var tried []string
	for _, path := range candidates {
		abs, absErr := filepath.Abs(path)
		if absErr != nil {
			continue
		}
		tried = append(tried, abs)

		info, statErr := os.Stat(abs)
		if statErr != nil || info.IsDir() {
			continue
		}

		if loadErr := godotenv.Load(abs); loadErr != nil {
			log.Fatalf("Found .env at %s but failed to parse it: %v", abs, loadErr)
		}

		log.Printf("Loaded .env from %s", abs)
		return
	}

	log.Fatalf(
		"No .env file found. Run from ironcoach/backend (tried: %v). Or set ENV=production and inject env vars.",
		tried,
	)
}

func ConnectDB() {
	LoadEnv()

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		log.Fatal("MONGODB_URI is not set in the environment variables")
	}

	clientOptions := options.Client().ApplyURI(mongoURI)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	DB = client
	fmt.Println("Connected to MongoDB!")
}
