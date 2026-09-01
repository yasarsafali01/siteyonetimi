package security

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
	rg.GET("/sites/:siteId/checkpoints", h.listCheckpoints)
	rg.POST("/sites/:siteId/checkpoints", h.createCheckpoint)

	rg.GET("/sites/:siteId/patrols", h.listPatrols)
	rg.POST("/sites/:siteId/patrols", h.startPatrol)
	rg.POST("/patrols/:patrolId/scan", h.scanCheckpoint)
	rg.GET("/patrols/:patrolId/scans", h.listScans)
	rg.POST("/patrols/:patrolId/complete", h.completePatrol)

	rg.GET("/sites/:siteId/incidents", h.listIncidents)
	rg.POST("/sites/:siteId/incidents", h.createIncident)

	rg.GET("/sites/:siteId/security-shifts", h.listShifts)
	rg.POST("/sites/:siteId/security-shifts", h.createShift)
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

// --- Checkpoints ---

type checkpointRequest struct {
	Name     string  `json:"name" binding:"required"`
	Location *string `json:"location"`
}

func (h *Handler) createCheckpoint(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req checkpointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateCheckpoint(c.Request.Context(), tenantID(c), siteID, req.Name, req.Location)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCheckpoints(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListCheckpoints(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Patrols ---

func (h *Handler) startPatrol(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.StartPatrol(c.Request.Context(), tenantID(c), siteID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPatrols(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListPatrols(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type scanRequest struct {
	CheckpointID uuid.UUID `json:"checkpointId" binding:"required"`
}

func (h *Handler) scanCheckpoint(c *gin.Context) {
	patrolID, ok := paramUUID(c, "patrolId")
	if !ok {
		return
	}
	var req scanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.ScanCheckpoint(c.Request.Context(), tenantID(c), patrolID, req.CheckpointID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listScans(c *gin.Context) {
	patrolID, ok := paramUUID(c, "patrolId")
	if !ok {
		return
	}
	result, err := h.service.ListScans(c.Request.Context(), tenantID(c), patrolID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type completePatrolRequest struct {
	Note *string `json:"note"`
}

func (h *Handler) completePatrol(c *gin.Context) {
	patrolID, ok := paramUUID(c, "patrolId")
	if !ok {
		return
	}
	var req completePatrolRequest
	_ = c.ShouldBindJSON(&req)
	result, err := h.service.CompletePatrol(c.Request.Context(), tenantID(c), patrolID, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Incidents ---

type incidentRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	Severity    string  `json:"severity" binding:"required,oneof=dusuk orta yuksek kritik"`
	CameraNote  *string `json:"cameraNote"`
}

func (h *Handler) createIncident(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req incidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateIncident(c.Request.Context(), tenantID(c), siteID, req.Title, req.Description, req.Severity, req.CameraNote, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listIncidents(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListIncidents(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Shifts ---

type securityShiftRequest struct {
	GuardID   *uuid.UUID `json:"guardId"`
	ShiftDate string     `json:"shiftDate" binding:"required"`
	StartTime string     `json:"startTime" binding:"required"`
	EndTime   string     `json:"endTime" binding:"required"`
}

func (h *Handler) createShift(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req securityShiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateShift(c.Request.Context(), tenantID(c), siteID, req.GuardID, req.ShiftDate, req.StartTime, req.EndTime)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listShifts(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListShifts(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
