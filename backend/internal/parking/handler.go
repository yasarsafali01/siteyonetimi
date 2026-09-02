package parking

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"siteyonetimi/backend/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/sites/:siteId/parking-spots", h.listSpots)
	rg.POST("/sites/:siteId/parking-spots", h.createSpot)

	rg.GET("/sites/:siteId/parking-vehicles", h.listVehicleRecords)
	rg.POST("/sites/:siteId/parking-vehicles/check-in", h.checkInVehicle)
	rg.POST("/parking-vehicles/:recordId/check-out", h.exitVehicle)

	rg.GET("/sites/:siteId/parking-reservations", h.listReservations)
	rg.POST("/sites/:siteId/parking-reservations", h.createReservation)
	rg.POST("/parking-reservations/:reservationId/cancel", h.cancelReservation)
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
	case errors.Is(err, ErrSpotOccupied):
		c.JSON(http.StatusConflict, gin.H{"error": "park alanı bu aralıkta zaten rezerve edilmiş"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

// --- Spots ---

type spotRequest struct {
	SpotNumber string     `json:"spotNumber" binding:"required"`
	SpotType   string     `json:"spotType" binding:"required,oneof=sakin misafir engelli"`
	UnitID     *uuid.UUID `json:"unitId"`
}

func (h *Handler) createSpot(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req spotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateSpot(c.Request.Context(), tenantID(c), siteID, req.SpotNumber, req.SpotType, req.UnitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listSpots(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListSpots(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Vehicle Records ---

type checkInVehicleRequest struct {
	SpotID    *uuid.UUID `json:"spotId"`
	Plate     string     `json:"plate" binding:"required"`
	OwnerType string     `json:"ownerType" binding:"required,oneof=sakin misafir"`
	UnitID    *uuid.UUID `json:"unitId"`
}

func (h *Handler) checkInVehicle(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req checkInVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CheckInVehicle(c.Request.Context(), tenantID(c), siteID, req.SpotID, req.Plate, req.OwnerType, req.UnitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) exitVehicle(c *gin.Context) {
	recordID, ok := paramUUID(c, "recordId")
	if !ok {
		return
	}
	result, err := h.service.ExitVehicle(c.Request.Context(), tenantID(c), recordID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) listVehicleRecords(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	plate := c.Query("plate")
	result, err := h.service.ListVehicleRecords(c.Request.Context(), tenantID(c), siteID, plate)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Reservations ---

type reservationRequest struct {
	SpotID    uuid.UUID  `json:"spotId" binding:"required"`
	UnitID    *uuid.UUID `json:"unitId"`
	StartTime string     `json:"startTime" binding:"required"`
	EndTime   string     `json:"endTime" binding:"required"`
}

func (h *Handler) createReservation(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req reservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateReservation(c.Request.Context(), tenantID(c), siteID, req.SpotID, req.UnitID, userID(c), req.StartTime, req.EndTime)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) cancelReservation(c *gin.Context) {
	reservationID, ok := paramUUID(c, "reservationId")
	if !ok {
		return
	}
	result, err := h.service.CancelReservation(c.Request.Context(), tenantID(c), reservationID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) listReservations(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListReservations(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
