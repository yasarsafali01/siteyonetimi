package httpserver

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"siteyonetimi/backend/internal/auth"
	"siteyonetimi/backend/internal/config"
)

func New(pool *pgxpool.Pool, cfg config.Config) *gin.Engine {
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	authService := auth.NewService(pool, cfg)
	authHandler := auth.NewHandler(authService)

	api := router.Group("/api/v1")
	authHandler.RegisterRoutes(api.Group("/auth"))

	return router
}
