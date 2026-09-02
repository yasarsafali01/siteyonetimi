package announcement

import (
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
	rg.GET("/sites/:siteId/announcements", h.listAnnouncements)
	rg.POST("/sites/:siteId/announcements", h.createAnnouncement)
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

type announcementRequest struct {
	Title         string     `json:"title" binding:"required"`
	Content       string     `json:"content" binding:"required"`
	Category      string     `json:"category" binding:"required,oneof=duyuru haber"`
	TargetBlockID *uuid.UUID `json:"targetBlockId"`
	Channels      []string   `json:"channels"`
}

func (h *Handler) createAnnouncement(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req announcementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateAnnouncement(c.Request.Context(), tenantID(c), siteID, req.Title, req.Content, req.Category, req.TargetBlockID, req.Channels, userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listAnnouncements(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListAnnouncements(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
}
