package meter

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"siteyonetimi/backend/internal/finance"
	"siteyonetimi/backend/internal/middleware"
)

type Handler struct {
	service        *Service
	financeService *finance.Service
}

func NewHandler(service *Service, financeService *finance.Service) *Handler {
	return &Handler{service: service, financeService: financeService}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/sites/:siteId/meters", h.listMeters)
	rg.POST("/sites/:siteId/meters", h.createMeter)
	rg.POST("/sites/:siteId/meters/bulk-reading", h.bulkReading)

	rg.GET("/meters/:meterId/readings", h.listReadings)
	rg.POST("/meters/:meterId/readings", h.createReading)
	rg.GET("/meters/:meterId/consumption", h.consumptionHistory)
	rg.POST("/meters/:meterId/invoice", h.generateInvoice)
}

func tenantID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middleware.ContextKeyTenantID)
	id, _ := v.(uuid.UUID)
	return id
}

func userID(c *gin.Context) *uuid.UUID {
	v, ok := c.Get(middleware.ContextKeyUserID)
	if !ok {
		return nil
	}
	id, ok := v.(uuid.UUID)
	if !ok {
		return nil
	}
	return &id
}

func paramUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz " + name})
		return uuid.Nil, false
	}
	return id, true
}

func handleServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
	case errors.Is(err, ErrNotEnoughReadings):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

// --- Meters ---

type meterRequest struct {
	UnitID    *uuid.UUID `json:"unitId"`
	Type      string     `json:"type" binding:"required,oneof=elektrik su dogalgaz kalorimetre"`
	SerialNo  *string    `json:"serialNo"`
	UnitPrice float64    `json:"unitPrice" binding:"gte=0"`
}

func (h *Handler) createMeter(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req meterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateMeter(c.Request.Context(), tenantID(c), siteID, req.UnitID, req.Type, req.SerialNo, req.UnitPrice)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listMeters(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListMeters(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Readings ---

type readingRequest struct {
	ReadingDate string  `json:"readingDate" binding:"required"`
	Value       float64 `json:"value" binding:"required"`
}

func (h *Handler) createReading(c *gin.Context) {
	meterID, ok := paramUUID(c, "meterId")
	if !ok {
		return
	}
	var req readingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateReading(c.Request.Context(), tenantID(c), meterID, req.ReadingDate, req.Value, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

type bulkReadingRequest struct {
	ReadingDate string `json:"readingDate" binding:"required"`
	Readings    []struct {
		MeterID uuid.UUID `json:"meterId" binding:"required"`
		Value   float64   `json:"value" binding:"required"`
	} `json:"readings" binding:"required,min=1"`
}

func (h *Handler) bulkReading(c *gin.Context) {
	if _, ok := paramUUID(c, "siteId"); !ok {
		return
	}
	var req bulkReadingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inputs := make([]BulkReadingInput, 0, len(req.Readings))
	for _, r := range req.Readings {
		inputs = append(inputs, BulkReadingInput{MeterID: r.MeterID, ReadingDate: req.ReadingDate, Value: r.Value})
	}

	result, err := h.service.BulkCreateReadings(c.Request.Context(), tenantID(c), inputs, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listReadings(c *gin.Context) {
	meterID, ok := paramUUID(c, "meterId")
	if !ok {
		return
	}
	result, err := h.service.ListReadings(c.Request.Context(), tenantID(c), meterID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) consumptionHistory(c *gin.Context) {
	meterID, ok := paramUUID(c, "meterId")
	if !ok {
		return
	}
	result, err := h.service.GetConsumptionHistory(c.Request.Context(), tenantID(c), meterID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// generateInvoice (Faturalandırma): son iki okuma arasındaki tüketimi Finans modülünde
// bir borç (charge) kaydına dönüştürür. Sayaç bir bağımsız bölüme bağlı olmalıdır.
func (h *Handler) generateInvoice(c *gin.Context) {
	meterID, ok := paramUUID(c, "meterId")
	if !ok {
		return
	}

	meter, err := h.service.GetMeter(c.Request.Context(), tenantID(c), meterID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	if meter.UnitID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sayaç bir bağımsız bölüme bağlı değil, faturalandırılamaz"})
		return
	}

	consumption, err := h.service.LatestConsumption(c.Request.Context(), tenantID(c), meterID)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	amount := consumption.Consumption * meter.UnitPrice
	description := fmt.Sprintf("%s tüketim faturası (%s - %s, %.2f birim)",
		meterTypeLabel(meter.Type), consumption.FromDate.Format("2006-01-02"), consumption.ToDate.Format("2006-01-02"), consumption.Consumption)

	charge, err := h.financeService.CreateCharge(c.Request.Context(), tenantID(c), meter.SiteID, *meter.UnitID, finance.ChargeInput{
		Type:        "sayac_tuketimi",
		Description: &description,
		Amount:      amount,
	}, userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "fatura oluşturulamadı"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"consumption": consumption, "charge": charge})
}

func meterTypeLabel(t string) string {
	switch t {
	case "elektrik":
		return "Elektrik"
	case "su":
		return "Su"
	case "dogalgaz":
		return "Doğalgaz"
	case "kalorimetre":
		return "Kalorimetre"
	default:
		return t
	}
}
