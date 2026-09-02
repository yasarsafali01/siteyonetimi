package site

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
	rg.GET("/sites", h.listSites)
	rg.POST("/sites", h.createSite)
	rg.GET("/sites/:siteId", h.getSite)
	rg.PUT("/sites/:siteId", h.updateSite)
	rg.DELETE("/sites/:siteId", h.deactivateSite)

	rg.GET("/sites/:siteId/blocks", h.listBlocks)
	rg.POST("/sites/:siteId/blocks", h.createBlock)
	rg.PUT("/blocks/:blockId", h.updateBlock)
	rg.DELETE("/blocks/:blockId", h.deactivateBlock)

	rg.GET("/blocks/:blockId/units", h.listUnits)
	rg.POST("/blocks/:blockId/units", h.createUnit)
	rg.PUT("/units/:unitId", h.updateUnit)
	rg.DELETE("/units/:unitId", h.deactivateUnit)

	rg.GET("/sites/:siteId/common-areas", h.listCommonAreas)
	rg.POST("/sites/:siteId/common-areas", h.createCommonArea)
	rg.DELETE("/common-areas/:areaId", h.deactivateCommonArea)

	rg.GET("/sites/:siteId/managers", h.listManagers)
	rg.POST("/sites/:siteId/managers", h.addManager)
	rg.DELETE("/sites/:siteId/managers/:userId", h.removeManager)
}

func tenantID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middleware.ContextKeyTenantID)
	id, _ := v.(uuid.UUID)
	return id
}

func currentUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middleware.ContextKeyUserID)
	id, _ := v.(uuid.UUID)
	return id
}

func isSuperAdmin(c *gin.Context) bool {
	v, _ := c.Get(middleware.ContextKeyIsSuperAdmin)
	sa, _ := v.(bool)
	return sa
}

func handleServiceError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
}

// --- Sites ---

type siteRequest struct {
	Name     string  `json:"name" binding:"required"`
	Address  *string `json:"address"`
	IsActive *bool   `json:"isActive"`
}

func (h *Handler) createSite(c *gin.Context) {
	var req siteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateSite(c.Request.Context(), tenantID(c), req.Name, req.Address)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listSites(c *gin.Context) {
	result, err := h.service.ListAccessibleSites(c.Request.Context(), tenantID(c), currentUserID(c), isSuperAdmin(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) getSite(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	result, err := h.service.GetSite(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) updateSite(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	var req siteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	result, err := h.service.UpdateSite(c.Request.Context(), tenantID(c), siteID, req.Name, req.Address, isActive)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateSite(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	if err := h.service.DeactivateSite(c.Request.Context(), tenantID(c), siteID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Blocks ---

type blockRequest struct {
	Name       string `json:"name" binding:"required"`
	FloorCount *int   `json:"floorCount"`
	IsActive   *bool  `json:"isActive"`
}

func (h *Handler) createBlock(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	var req blockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateBlock(c.Request.Context(), tenantID(c), siteID, req.Name, req.FloorCount)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listBlocks(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	result, err := h.service.ListBlocks(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) updateBlock(c *gin.Context) {
	blockID, err := uuid.Parse(c.Param("blockId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz blok id"})
		return
	}
	var req blockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	result, err := h.service.UpdateBlock(c.Request.Context(), tenantID(c), blockID, req.Name, req.FloorCount, isActive)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateBlock(c *gin.Context) {
	blockID, err := uuid.Parse(c.Param("blockId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz blok id"})
		return
	}
	if err := h.service.DeactivateBlock(c.Request.Context(), tenantID(c), blockID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Units ---

type unitRequest struct {
	UnitNumber      string   `json:"unitNumber" binding:"required"`
	Floor           *int     `json:"floor"`
	Type            string   `json:"type" binding:"required,oneof=daire dukkan ofis"`
	GrossSqm        *float64 `json:"grossSqm"`
	NetSqm          *float64 `json:"netSqm"`
	LandShare       *float64 `json:"landShare"`
	DuesCoefficient *float64 `json:"duesCoefficient"`
	TitleDeedNo     *string  `json:"titleDeedNo"`
	TitleDeedType   *string  `json:"titleDeedType"`
	IsActive        *bool    `json:"isActive"`
}

func (r unitRequest) toInput() UnitInput {
	coefficient := 1.0
	if r.DuesCoefficient != nil {
		coefficient = *r.DuesCoefficient
	}
	return UnitInput{
		UnitNumber:      r.UnitNumber,
		Floor:           r.Floor,
		Type:            r.Type,
		GrossSqm:        r.GrossSqm,
		NetSqm:          r.NetSqm,
		LandShare:       r.LandShare,
		DuesCoefficient: coefficient,
		TitleDeedNo:     r.TitleDeedNo,
		TitleDeedType:   r.TitleDeedType,
	}
}

func (h *Handler) createUnit(c *gin.Context) {
	blockID, err := uuid.Parse(c.Param("blockId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz blok id"})
		return
	}
	var req unitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	siteID, err := h.service.BlockSiteID(c.Request.Context(), tenantID(c), blockID)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	result, err := h.service.CreateUnit(c.Request.Context(), tenantID(c), siteID, blockID, req.toInput())
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listUnits(c *gin.Context) {
	blockID, err := uuid.Parse(c.Param("blockId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz blok id"})
		return
	}
	result, err := h.service.ListUnits(c.Request.Context(), tenantID(c), blockID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) updateUnit(c *gin.Context) {
	unitID, err := uuid.Parse(c.Param("unitId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz daire id"})
		return
	}
	var req unitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	result, err := h.service.UpdateUnit(c.Request.Context(), tenantID(c), unitID, req.toInput(), isActive)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateUnit(c *gin.Context) {
	unitID, err := uuid.Parse(c.Param("unitId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz daire id"})
		return
	}
	if err := h.service.DeactivateUnit(c.Request.Context(), tenantID(c), unitID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Common Areas ---

type commonAreaRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description *string  `json:"description"`
	AreaSqm     *float64 `json:"areaSqm"`
}

func (h *Handler) createCommonArea(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	var req commonAreaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateCommonArea(c.Request.Context(), tenantID(c), siteID, req.Name, req.Description, req.AreaSqm)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCommonAreas(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	result, err := h.service.ListCommonAreas(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateCommonArea(c *gin.Context) {
	areaID, err := uuid.Parse(c.Param("areaId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz alan id"})
		return
	}
	if err := h.service.DeactivateCommonArea(c.Request.Context(), tenantID(c), areaID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Site Managers ---

func (h *Handler) listManagers(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	result, err := h.service.ListManagers(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type addManagerRequest struct {
	UserID uuid.UUID `json:"userId" binding:"required"`
}

func (h *Handler) addManager(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	var req addManagerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.AddManager(c.Request.Context(), tenantID(c), siteID, req.UserID); err != nil {
		if errors.Is(err, ErrManagerIneligible) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusCreated)
}

func (h *Handler) removeManager(c *gin.Context) {
	siteID, err := uuid.Parse(c.Param("siteId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
		return
	}
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz kullanıcı id"})
		return
	}
	if err := h.service.RemoveManager(c.Request.Context(), tenantID(c), siteID, userID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
