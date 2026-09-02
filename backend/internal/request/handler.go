package request

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
	rg.GET("/sites/:siteId/requests", h.list)
	rg.POST("/sites/:siteId/requests", h.create)
	rg.GET("/requests/:requestId", h.get)
	rg.POST("/requests/:requestId/assign", h.assign)
	rg.POST("/requests/:requestId/status", h.changeStatus)
	rg.GET("/requests/:requestId/status-history", h.statusHistory)

	rg.GET("/requests/:requestId/attachments", h.listAttachments)
	rg.POST("/requests/:requestId/attachments", h.addAttachment)
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

// callerUnitIDs, sakin tipi kullanıcının malik/kiracı olduğu birimlerin id listesini döner.
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

type createRequest struct {
	UnitID      *uuid.UUID `json:"unitId"`
	ReportedBy  *uuid.UUID `json:"reportedBy"`
	Type        string     `json:"type" binding:"required,oneof=ariza sikayet oneri"`
	Title       string     `json:"title" binding:"required"`
	Description *string    `json:"description"`
	Priority    string     `json:"priority" binding:"required,oneof=dusuk normal yuksek acil"`
}

func (h *Handler) create(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req createRequest
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
			c.JSON(http.StatusForbidden, gin.H{"error": "sadece kendi biriminiz için talep açabilirsiniz"})
			return
		}
		req.ReportedBy = pid
	}

	result, err := h.service.Create(c.Request.Context(), tenantID(c), siteID, CreateInput{
		UnitID: req.UnitID, ReportedBy: req.ReportedBy, Type: req.Type, Title: req.Title, Description: req.Description, Priority: req.Priority,
	}, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) list(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.List(c.Request.Context(), tenantID(c), siteID, c.Query("status"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	if userType(c) == "sakin" {
		ownUnits := h.callerUnitIDs(c)
		filtered := make([]Request, 0, len(result))
		for _, r := range result {
			if r.UnitID != nil && slices.Contains(ownUnits, *r.UnitID) {
				filtered = append(filtered, r)
			}
		}
		result = filtered
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) get(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	result, err := h.service.Get(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	if userType(c) == "sakin" && (result.UnitID == nil || !slices.Contains(h.callerUnitIDs(c), *result.UnitID)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu talebi görüntüleme yetkiniz yok"})
		return
	}
	c.JSON(http.StatusOK, result)
}

type assignRequest struct {
	AssigneeID uuid.UUID `json:"assigneeId" binding:"required"`
}

func (h *Handler) assign(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	var req assignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.Assign(c.Request.Context(), tenantID(c), requestID, req.AssigneeID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type statusRequest struct {
	Status string  `json:"status" binding:"required,oneof=yeni atandi inceleniyor cozuldu kapatildi"`
	Note   *string `json:"note"`
}

func (h *Handler) changeStatus(c *gin.Context) {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return
	}
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	var req statusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.ChangeStatus(c.Request.Context(), tenantID(c), requestID, req.Status, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) statusHistory(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	if !h.callerOwnsRequest(c, requestID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu talebe erişim yetkiniz yok"})
		return
	}
	result, err := h.service.ListStatusHistory(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type attachmentRequest struct {
	FileName    string  `json:"fileName" binding:"required"`
	FileURL     string  `json:"fileUrl" binding:"required"`
	ContentType *string `json:"contentType"`
}

// callerOwnsRequest, sakin kullanıcının verilen talebin kendi birimine ait olup
// olmadığını doğrular; yönetici için her zaman true döner.
func (h *Handler) callerOwnsRequest(c *gin.Context, requestID uuid.UUID) bool {
	if userType(c) != "sakin" {
		return true
	}
	r, err := h.service.Get(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		return false
	}
	return r.UnitID != nil && slices.Contains(h.callerUnitIDs(c), *r.UnitID)
}

func (h *Handler) addAttachment(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	if !h.callerOwnsRequest(c, requestID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu talebe erişim yetkiniz yok"})
		return
	}
	var req attachmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.AddAttachment(c.Request.Context(), tenantID(c), requestID, req.FileName, req.FileURL, req.ContentType, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listAttachments(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	if !h.callerOwnsRequest(c, requestID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu talebe erişim yetkiniz yok"})
		return
	}
	result, err := h.service.ListAttachments(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
