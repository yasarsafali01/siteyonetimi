package inventory

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
	rg.GET("/sites/:siteId/assets", h.listAssets)
	rg.POST("/sites/:siteId/assets", h.createAsset)
	rg.GET("/assets/:assetId/depreciation", h.depreciation)
	rg.POST("/assets/:assetId/assign", h.assignAsset)
	rg.POST("/assets/:assetId/return", h.returnAsset)
	rg.GET("/assets/:assetId/assignments", h.listAssignments)

	rg.GET("/sites/:siteId/asset-counts", h.listCounts)
	rg.POST("/sites/:siteId/asset-counts", h.createCount)
	rg.GET("/asset-counts/:countId/items", h.listCountItems)
	rg.POST("/asset-counts/:countId/items", h.addCountItem)
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
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
}

// --- Assets ---

type assetRequest struct {
	Name            string   `json:"name" binding:"required"`
	SerialNo        *string  `json:"serialNo"`
	Category        *string  `json:"category"`
	PurchaseDate    *string  `json:"purchaseDate"`
	PurchasePrice   *float64 `json:"purchasePrice"`
	UsefulLifeYears *int     `json:"usefulLifeYears"`
	WarrantyUntil   *string  `json:"warrantyUntil"`
}

func (h *Handler) createAsset(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req assetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateAsset(c.Request.Context(), tenantID(c), siteID, AssetInput{
		Name: req.Name, SerialNo: req.SerialNo, Category: req.Category, PurchaseDate: req.PurchaseDate,
		PurchasePrice: req.PurchasePrice, UsefulLifeYears: req.UsefulLifeYears, WarrantyUntil: req.WarrantyUntil,
	})
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listAssets(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListAssets(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) depreciation(c *gin.Context) {
	assetID, ok := paramUUID(c, "assetId")
	if !ok {
		return
	}
	result, err := h.service.Depreciation(c.Request.Context(), tenantID(c), assetID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Assignments ---

type assignRequest struct {
	UserID uuid.UUID `json:"userId" binding:"required"`
	Note   *string   `json:"note"`
}

func (h *Handler) assignAsset(c *gin.Context) {
	assetID, ok := paramUUID(c, "assetId")
	if !ok {
		return
	}
	var req assignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.AssignAsset(c.Request.Context(), tenantID(c), assetID, req.UserID, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) returnAsset(c *gin.Context) {
	assetID, ok := paramUUID(c, "assetId")
	if !ok {
		return
	}
	if err := h.service.ReturnAsset(c.Request.Context(), tenantID(c), assetID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) listAssignments(c *gin.Context) {
	assetID, ok := paramUUID(c, "assetId")
	if !ok {
		return
	}
	result, err := h.service.ListAssignments(c.Request.Context(), tenantID(c), assetID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Counts ---

type countRequest struct {
	Note *string `json:"note"`
}

func (h *Handler) createCount(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req countRequest
	_ = c.ShouldBindJSON(&req)
	result, err := h.service.CreateCount(c.Request.Context(), tenantID(c), siteID, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCounts(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListCounts(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type countItemRequest struct {
	AssetID uuid.UUID `json:"assetId" binding:"required"`
	Found   bool      `json:"found"`
	Note    *string   `json:"note"`
}

func (h *Handler) addCountItem(c *gin.Context) {
	countID, ok := paramUUID(c, "countId")
	if !ok {
		return
	}
	var req countItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.AddCountItem(c.Request.Context(), tenantID(c), countID, req.AssetID, req.Found, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCountItems(c *gin.Context) {
	countID, ok := paramUUID(c, "countId")
	if !ok {
		return
	}
	result, err := h.service.ListCountItems(c.Request.Context(), tenantID(c), countID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
