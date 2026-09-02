package httpserver

import (
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"siteyonetimi/backend/internal/access"
	"siteyonetimi/backend/internal/accounting"
	"siteyonetimi/backend/internal/announcement"
	"siteyonetimi/backend/internal/auth"
	"siteyonetimi/backend/internal/cargo"
	"siteyonetimi/backend/internal/config"
	"siteyonetimi/backend/internal/crm"
	"siteyonetimi/backend/internal/document"
	"siteyonetimi/backend/internal/finance"
	"siteyonetimi/backend/internal/hr"
	"siteyonetimi/backend/internal/inventory"
	"siteyonetimi/backend/internal/legal"
	"siteyonetimi/backend/internal/maintenance"
	"siteyonetimi/backend/internal/meter"
	"siteyonetimi/backend/internal/middleware"
	"siteyonetimi/backend/internal/parking"
	"siteyonetimi/backend/internal/procurement"
	"siteyonetimi/backend/internal/reporting"
	"siteyonetimi/backend/internal/request"
	"siteyonetimi/backend/internal/reservation"
	"siteyonetimi/backend/internal/security"
	"siteyonetimi/backend/internal/site"
	"siteyonetimi/backend/internal/survey"
	"siteyonetimi/backend/internal/visitor"
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

	siteService := site.NewService(pool)
	siteHandler := site.NewHandler(siteService)

	crmService := crm.NewService(pool)
	crmHandler := crm.NewHandler(crmService)

	financeService := finance.NewService(pool)
	financeHandler := finance.NewHandler(financeService)

	accountingService := accounting.NewService(pool)
	accountingHandler := accounting.NewHandler(accountingService)

	meterService := meter.NewService(pool)
	meterHandler := meter.NewHandler(meterService, financeService)

	requestService := request.NewService(pool)
	requestHandler := request.NewHandler(requestService)

	maintenanceService := maintenance.NewService(pool)
	maintenanceHandler := maintenance.NewHandler(maintenanceService)

	inventoryService := inventory.NewService(pool)
	inventoryHandler := inventory.NewHandler(inventoryService)

	procurementService := procurement.NewService(pool)
	procurementHandler := procurement.NewHandler(procurementService)

	hrService := hr.NewService(pool)
	hrHandler := hr.NewHandler(hrService)

	securityService := security.NewService(pool)
	securityHandler := security.NewHandler(securityService)

	visitorService := visitor.NewService(pool)
	visitorHandler := visitor.NewHandler(visitorService)

	accessService := access.NewService(pool)
	accessHandler := access.NewHandler(accessService)

	parkingService := parking.NewService(pool)
	parkingHandler := parking.NewHandler(parkingService)

	cargoService := cargo.NewService(pool)
	cargoHandler := cargo.NewHandler(cargoService)

	reservationService := reservation.NewService(pool)
	reservationHandler := reservation.NewHandler(reservationService)

	announcementService := announcement.NewService(pool)
	announcementHandler := announcement.NewHandler(announcementService)

	surveyService := survey.NewService(pool)
	surveyHandler := survey.NewHandler(surveyService)

	documentService := document.NewService(pool)
	documentHandler := document.NewHandler(documentService)

	legalService := legal.NewService(pool)
	legalHandler := legal.NewHandler(legalService)

	reportingService := reporting.NewService(pool)
	reportingHandler := reporting.NewHandler(reportingService)

	api := router.Group("/api/v1")
	authHandler.RegisterRoutes(api.Group("/auth"))

	protected := api.Group("")
	protected.Use(middleware.RequireAuth(cfg.JWTAccessSecret))
	siteHandler.RegisterRoutes(protected)
	crmHandler.RegisterRoutes(protected)
	financeHandler.RegisterRoutes(protected)
	accountingHandler.RegisterRoutes(protected)
	meterHandler.RegisterRoutes(protected)
	requestHandler.RegisterRoutes(protected)
	maintenanceHandler.RegisterRoutes(protected)
	inventoryHandler.RegisterRoutes(protected)
	procurementHandler.RegisterRoutes(protected)
	hrHandler.RegisterRoutes(protected)
	securityHandler.RegisterRoutes(protected)
	visitorHandler.RegisterRoutes(protected)
	accessHandler.RegisterRoutes(protected)
	parkingHandler.RegisterRoutes(protected)
	cargoHandler.RegisterRoutes(protected)
	reservationHandler.RegisterRoutes(protected)
	announcementHandler.RegisterRoutes(protected)
	surveyHandler.RegisterRoutes(protected)
	documentHandler.RegisterRoutes(protected)
	legalHandler.RegisterRoutes(protected)
	reportingHandler.RegisterRoutes(protected)

	return router
}
