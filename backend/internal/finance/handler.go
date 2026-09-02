package finance

import (
	"errors"
	"net/http"
	"slices"
	"time"

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
	rg.POST("/units/:unitId/charges", h.createCharge)
	rg.GET("/units/:unitId/charges", h.listChargesForUnit)
	rg.GET("/units/:unitId/balance", h.getUnitBalance)

	rg.POST("/sites/:siteId/charges/bulk-generate", h.bulkGenerateDues)
	rg.GET("/sites/:siteId/charges", h.listChargesForSite)

	rg.GET("/persons/:personId/balance", h.getPersonBalance)

	rg.DELETE("/charges/:chargeId", h.deleteCharge)
	rg.POST("/charges/:chargeId/payments", h.createPayment)
	rg.GET("/charges/:chargeId/payments", h.listPaymentsForCharge)

	rg.PATCH("/payments/:paymentId/reassign", h.reassignPayment)
	rg.DELETE("/payments/:paymentId", h.deletePayment)
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

// forbidSakin, mali işlem (borç oluşturma/silme, tahsilat, toplu üretim) endpoint'lerini
// sadece yönetici için açık tutar.
func forbidSakin(c *gin.Context) bool {
	if userType(c) == "sakin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return true
	}
	return false
}

func handleServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
	case errors.Is(err, ErrHasPayments):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

// --- Charges ---

type chargeRequest struct {
	Type        string     `json:"type" binding:"required,oneof=aidat ek_aidat ozel_gider gecikme_faizi gecikme_tazminati"`
	Period      *string    `json:"period"`
	Description *string    `json:"description"`
	Amount      float64    `json:"amount" binding:"required,gt=0"`
	DueDate     *time.Time `json:"dueDate"`
}

func (h *Handler) createCharge(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	unitID, ok := paramUUID(c, "unitId")
	if !ok {
		return
	}
	var req chargeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	siteID, err := h.service.UnitSiteID(c.Request.Context(), tenantID(c), unitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}

	result, err := h.service.CreateCharge(c.Request.Context(), tenantID(c), siteID, unitID, ChargeInput{
		Type: req.Type, Period: req.Period, Description: req.Description, Amount: req.Amount, DueDate: req.DueDate,
	}, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listChargesForUnit(c *gin.Context) {
	unitID, ok := paramUUID(c, "unitId")
	if !ok {
		return
	}
	if userType(c) == "sakin" && !slices.Contains(h.callerUnitIDs(c), unitID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sadece kendi biriminizin borçlarını görüntüleyebilirsiniz"})
		return
	}
	result, err := h.service.ListChargesForUnit(c.Request.Context(), tenantID(c), unitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) getUnitBalance(c *gin.Context) {
	unitID, ok := paramUUID(c, "unitId")
	if !ok {
		return
	}
	if userType(c) == "sakin" && !slices.Contains(h.callerUnitIDs(c), unitID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "sadece kendi biriminizin bakiyesini görüntüleyebilirsiniz"})
		return
	}
	result, err := h.service.GetUnitBalance(c.Request.Context(), tenantID(c), unitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) getPersonBalance(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	if userType(c) == "sakin" {
		pid := callerPersonID(c)
		if pid == nil || *pid != personID {
			c.JSON(http.StatusForbidden, gin.H{"error": "sadece kendi bakiyenizi görüntüleyebilirsiniz"})
			return
		}
	}
	result, err := h.service.GetPersonBalance(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteCharge(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	chargeID, ok := paramUUID(c, "chargeId")
	if !ok {
		return
	}
	if err := h.service.DeleteCharge(c.Request.Context(), tenantID(c), chargeID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) listChargesForSite(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListChargesForSite(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Bulk dues generation ---

type bulkGenerateRequest struct {
	Period     string    `json:"period" binding:"required"`
	DueDate    time.Time `json:"dueDate" binding:"required"`
	BaseAmount float64   `json:"baseAmount" binding:"required,gt=0"`
}

func (h *Handler) bulkGenerateDues(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req bulkGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.BulkGenerateDues(c.Request.Context(), tenantID(c), siteID, req.Period, req.DueDate, req.BaseAmount, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

// --- Payments ---

type paymentRequest struct {
	Amount float64    `json:"amount" binding:"required,gt=0"`
	Method string     `json:"method" binding:"required,oneof=nakit banka_havalesi diger"`
	PaidAt *time.Time `json:"paidAt"`
	Note   *string    `json:"note"`
}

func (h *Handler) createPayment(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	chargeID, ok := paramUUID(c, "chargeId")
	if !ok {
		return
	}
	var req paymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	paidAt := time.Now()
	if req.PaidAt != nil {
		paidAt = *req.PaidAt
	}
	result, err := h.service.CreatePayment(c.Request.Context(), tenantID(c), chargeID, req.Amount, req.Method, paidAt, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPaymentsForCharge(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	chargeID, ok := paramUUID(c, "chargeId")
	if !ok {
		return
	}
	result, err := h.service.ListPaymentsForCharge(c.Request.Context(), tenantID(c), chargeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type reassignRequest struct {
	ChargeID uuid.UUID `json:"chargeId" binding:"required"`
}

func (h *Handler) reassignPayment(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	paymentID, ok := paramUUID(c, "paymentId")
	if !ok {
		return
	}
	var req reassignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.ReassignPayment(c.Request.Context(), tenantID(c), paymentID, req.ChargeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deletePayment(c *gin.Context) {
	if forbidSakin(c) {
		return
	}
	paymentID, ok := paramUUID(c, "paymentId")
	if !ok {
		return
	}
	if err := h.service.DeletePayment(c.Request.Context(), tenantID(c), paymentID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
