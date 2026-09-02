package document

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
	rg.GET("/sites/:siteId/documents", h.listDocuments)
	rg.POST("/sites/:siteId/documents", h.createDocument)
	rg.DELETE("/documents/:documentId", h.deleteDocument)
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

type documentRequest struct {
	Category    string  `json:"category" binding:"required,oneof=karar_defteri tutanak sozlesme ruhsat sigorta_policesi fatura diger"`
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	FileURL     string  `json:"fileUrl" binding:"required"`
	ValidUntil  *string `json:"validUntil"`
}

func (h *Handler) createDocument(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req documentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateDocument(c.Request.Context(), tenantID(c), siteID, req.Category, req.Title, req.Description, req.FileURL, req.ValidUntil, userID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listDocuments(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListDocuments(c.Request.Context(), tenantID(c), siteID, c.Query("category"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteDocument(c *gin.Context) {
	documentID, ok := paramUUID(c, "documentId")
	if !ok {
		return
	}
	if err := h.service.DeleteDocument(c.Request.Context(), tenantID(c), documentID); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.Status(http.StatusNoContent)
}
