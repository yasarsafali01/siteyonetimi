package cargo

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
	rg.GET("/sites/:siteId/cargo-deliveries", h.listDeliveries)
	rg.POST("/sites/:siteId/cargo-deliveries", h.createDelivery)
	rg.POST("/cargo-deliveries/:deliveryId/deliver", h.deliverToResident)
	rg.POST("/cargo-deliveries/:deliveryId/return", h.markReturned)
	rg.POST("/cargo-deliveries/:deliveryId/notify", h.notifyRecipient)
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
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı veya durum uygun değil"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
}

type deliveryRequest struct {
	UnitID            *uuid.UUID `json:"unitId"`
	RecipientPersonID *uuid.UUID `json:"recipientPersonId"`
	CourierCompany    *string    `json:"courierCompany"`
	TrackingNo        *string    `json:"trackingNo"`
	Description       *string    `json:"description"`
}

func (h *Handler) createDelivery(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req deliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateDelivery(c.Request.Context(), tenantID(c), siteID, req.UnitID, req.RecipientPersonID, req.CourierCompany, req.TrackingNo, req.Description, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listDeliveries(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListDeliveries(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type deliverRequest struct {
	DeliveredTo string `json:"deliveredTo" binding:"required"`
}

func (h *Handler) deliverToResident(c *gin.Context) {
	deliveryID, ok := paramUUID(c, "deliveryId")
	if !ok {
		return
	}
	var req deliverRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.DeliverToResident(c.Request.Context(), tenantID(c), deliveryID, req.DeliveredTo)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) markReturned(c *gin.Context) {
	deliveryID, ok := paramUUID(c, "deliveryId")
	if !ok {
		return
	}
	result, err := h.service.MarkReturned(c.Request.Context(), tenantID(c), deliveryID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) notifyRecipient(c *gin.Context) {
	deliveryID, ok := paramUUID(c, "deliveryId")
	if !ok {
		return
	}
	result, err := h.service.NotifyRecipient(c.Request.Context(), tenantID(c), deliveryID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
