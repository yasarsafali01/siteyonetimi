package access

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
	rg.GET("/sites/:siteId/access-points", h.listPoints)
	rg.POST("/sites/:siteId/access-points", h.createPoint)
	rg.POST("/sites/:siteId/access-points/:pointId/scan", h.scan)

	rg.GET("/sites/:siteId/access-credentials", h.listCredentials)
	rg.POST("/sites/:siteId/access-credentials", h.createCredential)
	rg.POST("/access-credentials/:credentialId/revoke", h.revokeCredential)

	rg.GET("/sites/:siteId/access-logs", h.listLogs)
}

func tenantID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middleware.ContextKeyTenantID)
	id, _ := v.(uuid.UUID)
	return id
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
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
}

// --- Points ---

type pointRequest struct {
	Name     string  `json:"name" binding:"required"`
	Type     string  `json:"type" binding:"required,oneof=bariyer turnike kapi"`
	Location *string `json:"location"`
}

func (h *Handler) createPoint(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req pointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePoint(c.Request.Context(), tenantID(c), siteID, req.Name, req.Type, req.Location)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPoints(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListPoints(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Credentials ---

type credentialRequest struct {
	PersonID        *uuid.UUID `json:"personId"`
	UnitID          *uuid.UUID `json:"unitId"`
	Type            string     `json:"type" binding:"required,oneof=qr nfc kart plaka"`
	CredentialValue string     `json:"credentialValue" binding:"required"`
	ValidUntil      *string    `json:"validUntil"`
}

func (h *Handler) createCredential(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req credentialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateCredential(c.Request.Context(), tenantID(c), siteID, req.PersonID, req.UnitID, req.Type, req.CredentialValue, req.ValidUntil)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCredentials(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListCredentials(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) revokeCredential(c *gin.Context) {
	credentialID, ok := paramUUID(c, "credentialId")
	if !ok {
		return
	}
	result, err := h.service.RevokeCredential(c.Request.Context(), tenantID(c), credentialID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Scan / Logs ---

type scanRequest struct {
	Method string `json:"method" binding:"required,oneof=qr nfc kart plaka"`
	Value  string `json:"value" binding:"required"`
}

func (h *Handler) scan(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	pointID, ok := paramUUID(c, "pointId")
	if !ok {
		return
	}
	var req scanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.Scan(c.Request.Context(), tenantID(c), siteID, pointID, req.Method, req.Value)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listLogs(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListLogs(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
