package reservation

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
	rg.GET("/sites/:siteId/facility-reservations", h.listReservations)
	rg.POST("/sites/:siteId/facility-reservations", h.createReservation)
	rg.POST("/facility-reservations/:reservationId/decide", h.decideReservation)
	rg.POST("/facility-reservations/:reservationId/cancel", h.cancelReservation)
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
	case errors.Is(err, ErrOverlap):
		c.JSON(http.StatusConflict, gin.H{"error": "bu alan seçilen aralıkta zaten rezerve edilmiş"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

type reservationRequest struct {
	CommonAreaID uuid.UUID  `json:"commonAreaId" binding:"required"`
	UnitID       *uuid.UUID `json:"unitId"`
	PersonID     *uuid.UUID `json:"personId"`
	StartTime    string     `json:"startTime" binding:"required"`
	EndTime      string     `json:"endTime" binding:"required"`
	Note         *string    `json:"note"`
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
	result, err := h.service.CreateReservation(c.Request.Context(), tenantID(c), siteID, req.CommonAreaID, req.UnitID, req.PersonID, userID(c), req.StartTime, req.EndTime, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
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

type decideReservationRequest struct {
	Approve bool `json:"approve"`
}

func (h *Handler) decideReservation(c *gin.Context) {
	reservationID, ok := paramUUID(c, "reservationId")
	if !ok {
		return
	}
	var req decideReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.DecideReservation(c.Request.Context(), tenantID(c), reservationID, req.Approve, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
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
