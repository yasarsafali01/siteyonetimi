package main

import (
	"context"
	"log"

	"siteyonetimi/backend/internal/config"
	"siteyonetimi/backend/internal/db"
	"siteyonetimi/backend/internal/httpserver"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("veritabanına bağlanılamadı: %v", err)
	}
	defer pool.Close()

	router := httpserver.New(pool, cfg)

	log.Printf("API %s portunda başlatılıyor", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("sunucu başlatılamadı: %v", err)
	}
}
