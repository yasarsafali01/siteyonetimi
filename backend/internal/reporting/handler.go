package reporting

import (
	"net/http"
	"strconv"

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
	rg.GET("/sites/:siteId/reports/dashboard", h.dashboard)
	rg.GET("/sites/:siteId/reports/collection-rate", h.collectionRate)
	rg.GET("/sites/:siteId/reports/debtors", h.debtors)
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

func (h *Handler) dashboard(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.Dashboard(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) collectionRate(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	months, _ := strconv.Atoi(c.Query("months"))
	result, err := h.service.CollectionRate(c.Request.Context(), tenantID(c), siteID, months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) debtors(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.Debtors(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
}
