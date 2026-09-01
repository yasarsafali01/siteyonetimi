package maintenance

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
	rg.GET("/sites/:siteId/facilities", h.listFacilities)
	rg.POST("/sites/:siteId/facilities", h.createFacility)

	rg.GET("/facilities/:facilityId/plans", h.listPlans)
	rg.POST("/facilities/:facilityId/plans", h.createPlan)

	rg.GET("/sites/:siteId/maintenance/due-plans", h.listDuePlans)

	rg.GET("/sites/:siteId/work-orders", h.listWorkOrders)
	rg.POST("/sites/:siteId/work-orders", h.createWorkOrder)
	rg.POST("/work-orders/:workOrderId/assign", h.assignWorkOrder)
	rg.POST("/work-orders/:workOrderId/complete", h.completeWorkOrder)
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

// --- Facilities ---

type facilityRequest struct {
	Type     string  `json:"type" binding:"required,oneof=asansor jenerator havuz yangin_sistemi diger"`
	Name     string  `json:"name" binding:"required"`
	Location *string `json:"location"`
}

func (h *Handler) createFacility(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req facilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateFacility(c.Request.Context(), tenantID(c), siteID, req.Type, req.Name, req.Location)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listFacilities(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListFacilities(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Plans ---

type planRequest struct {
	Title         string `json:"title" binding:"required"`
	FrequencyDays int    `json:"frequencyDays" binding:"required,gt=0"`
	NextDueDate   string `json:"nextDueDate" binding:"required"`
}

func (h *Handler) createPlan(c *gin.Context) {
	facilityID, ok := paramUUID(c, "facilityId")
	if !ok {
		return
	}
	var req planRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePlan(c.Request.Context(), tenantID(c), facilityID, req.Title, req.FrequencyDays, req.NextDueDate)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPlans(c *gin.Context) {
	facilityID, ok := paramUUID(c, "facilityId")
	if !ok {
		return
	}
	result, err := h.service.ListPlans(c.Request.Context(), tenantID(c), facilityID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) listDuePlans(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListDuePlans(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Work Orders ---

type workOrderRequest struct {
	FacilityID    *uuid.UUID `json:"facilityId"`
	PlanID        *uuid.UUID `json:"planId"`
	Title         string     `json:"title" binding:"required"`
	Description   *string    `json:"description"`
	ScheduledDate *string    `json:"scheduledDate"`
}

func (h *Handler) createWorkOrder(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req workOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateWorkOrder(c.Request.Context(), tenantID(c), siteID, req.FacilityID, req.PlanID, req.Title, req.Description, req.ScheduledDate, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listWorkOrders(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListWorkOrders(c.Request.Context(), tenantID(c), siteID, c.Query("status"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type assignRequest struct {
	AssigneeID uuid.UUID `json:"assigneeId" binding:"required"`
}

func (h *Handler) assignWorkOrder(c *gin.Context) {
	workOrderID, ok := paramUUID(c, "workOrderId")
	if !ok {
		return
	}
	var req assignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.AssignWorkOrder(c.Request.Context(), tenantID(c), workOrderID, req.AssigneeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type completeRequest struct {
	Note *string `json:"note"`
}

func (h *Handler) completeWorkOrder(c *gin.Context) {
	workOrderID, ok := paramUUID(c, "workOrderId")
	if !ok {
		return
	}
	var req completeRequest
	_ = c.ShouldBindJSON(&req) // gövde boş olabilir (note opsiyonel)
	result, err := h.service.CompleteWorkOrder(c.Request.Context(), tenantID(c), workOrderID, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
