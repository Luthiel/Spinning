package main

import (
	"log"
	"os"

	"spinning/backend/internal/api"
	"spinning/backend/internal/db"
)

func main() {
	// Database path
	dsn := os.Getenv("DB_PATH")
	if dsn == "" {
		dsn = "./data/spinning.db"
	}

	// Initialise DB
	if err := db.Init(dsn); err != nil {
		log.Fatalf("DB init failed: %v", err)
	}

	// Seed demo data
	db.Seed()

	// Build router
	r := api.NewRouter(db.DB)

	// Listen
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Spinning backend starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
