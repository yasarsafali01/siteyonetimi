package visitor

import (
	"errors"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"siteyonetimi/backend/internal/crm"
	"siteyonetimi/backend/internal/middleware"
)

type Handler struct {
	service    *Service
	crmService *crm.Service
}

func NewHandler(service *Service, crmService *crm.Service) *Handler {
	return &Handler{service: service, crmService: crmService}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/sites/:siteId/visitor-invitations", h.listInvitations)
	rg.POST("/sites/:siteId/visitor-invitations", h.createInvitation)
	rg.POST("/visitor-invitations/:invitationId/decide", h.decideInvitation)

	rg.GET("/sites/:siteId/visitor-logs", h.listLogs)
	rg.POST("/sites/:siteId/visitor-logs/check-in", h.checkInWalkIn)
	rg.POST("/sites/:siteId/visitor-logs/check-in-code", h.checkInWithCode)
	rg.POST("/visitor-logs/:logId/check-out", h.checkOut)
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
	case errors.Is(err, ErrInvalidInvitation):
		c.JSON(http.StatusBadRequest, gin.H{"error": "davetiye geçersiz veya kullanılamaz"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

func userType(c *gin.Context) string {
	v, _ := c.Get(middleware.ContextKeyUserType)
	s, _ := v.(string)
	return s
}

func callerPersonID(c *gin.Context) *uuid.UUID {
	v, ok := c.Get(middleware.ContextKeyPersonID)
	if !ok {
		return nil
	}
	id, ok := v.(uuid.UUID)
	if !ok {
		return nil
	}
	return &id
}

func (h *Handler) callerUnitIDs(c *gin.Context) []uuid.UUID {
	pid := callerPersonID(c)
	if pid == nil {
		return nil
	}
	residencies, err := h.crmService.ListResidencesForPerson(c.Request.Context(), tenantID(c), *pid)
	if err != nil {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(residencies))
	for _, r := range residencies {
		if r.IsActive {
			ids = append(ids, r.UnitID)
		}
	}
	return ids
}

// --- Invitations ---

type invitationRequest struct {
	UnitID       *uuid.UUID `json:"unitId"`
	HostPersonID *uuid.UUID `json:"hostPersonId"`
	VisitorName  string     `json:"visitorName" binding:"required"`
	VisitorPhone *string    `json:"visitorPhone"`
	VehiclePlate *string    `json:"vehiclePlate"`
	ValidUntil   string     `json:"validUntil" binding:"required"`
}

func (h *Handler) createInvitation(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req invitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if userType(c) == "sakin" {
		pid := callerPersonID(c)
		if pid == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
			return
		}
		ownUnits := h.callerUnitIDs(c)
		if req.UnitID == nil {
			if len(ownUnits) != 1 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "unitId belirtilmeli"})
				return
			}
			req.UnitID = &ownUnits[0]
		} else if !slices.Contains(ownUnits, *req.UnitID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "sadece kendi biriminiz için davetiye oluşturabilirsiniz"})
			return
		}
		req.HostPersonID = pid
	}

	result, err := h.service.CreateInvitation(c.Request.Context(), tenantID(c), siteID, req.UnitID, req.HostPersonID, req.VisitorName, req.VisitorPhone, req.VehiclePlate, req.ValidUntil, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listInvitations(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListInvitations(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	if userType(c) == "sakin" {
		ownUnits := h.callerUnitIDs(c)
		filtered := make([]Invitation, 0, len(result))
		for _, inv := range result {
			if inv.UnitID != nil && slices.Contains(ownUnits, *inv.UnitID) {
				filtered = append(filtered, inv)
			}
		}
		result = filtered
	}
	c.JSON(http.StatusOK, result)
}

type decideInvitationRequest struct {
	Approve bool `json:"approve"`
}

func (h *Handler) decideInvitation(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	invitationID, ok := paramUUID(c, "invitationId")
	if !ok {
		return
	}
	var req decideInvitationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.DecideInvitation(c.Request.Context(), tenantID(c), invitationID, req.Approve, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Logs ---

func (h *Handler) listLogs(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
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

type walkInRequest struct {
	UnitID       *uuid.UUID `json:"unitId"`
	VisitorName  string     `json:"visitorName" binding:"required"`
	VisitorPhone *string    `json:"visitorPhone"`
	IDNumber     *string    `json:"idNumber"`
	VehiclePlate *string    `json:"vehiclePlate"`
	TempCardNo   *string    `json:"tempCardNo"`
	Note         *string    `json:"note"`
}

func (h *Handler) checkInWalkIn(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req walkInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CheckInWalkIn(c.Request.Context(), tenantID(c), siteID, req.UnitID, req.VisitorName, req.VisitorPhone, req.IDNumber, req.VehiclePlate, req.TempCardNo, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

type checkInCodeRequest struct {
	Code       string  `json:"code" binding:"required"`
	TempCardNo *string `json:"tempCardNo"`
}

func (h *Handler) checkInWithCode(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req checkInCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CheckInWithCode(c.Request.Context(), tenantID(c), siteID, req.Code, req.TempCardNo, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) checkOut(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	logID, ok := paramUUID(c, "logId")
	if !ok {
		return
	}
	result, err := h.service.CheckOut(c.Request.Context(), tenantID(c), logID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
