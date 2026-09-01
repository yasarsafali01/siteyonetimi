package config

import (
	"os"
	"strings"
	"time"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	JWTAccessSecret    string
	JWTRefreshSecret   string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	CORSAllowedOrigins []string
}

func Load() Config {
	return Config{
		Port:             getEnv("PORT", "8081"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:55432/siteyonetimi?sslmode=disable"),
		RedisURL:         getEnv("REDIS_URL", "localhost:6379"),
		JWTAccessSecret:  getEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
		AccessTokenTTL:   15 * time.Minute,
		RefreshTokenTTL:  30 * 24 * time.Hour,
		CORSAllowedOrigins: strings.Split(
			getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:19006"), ",",
		),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
