package accounting

import (
	"errors"
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
	rg.GET("/sites/:siteId/accounts", h.listAccounts)
	rg.POST("/sites/:siteId/accounts", h.createAccount)
	rg.DELETE("/accounts/:accountId", h.deactivateAccount)

	rg.GET("/sites/:siteId/journal-entries", h.listJournalEntries)
	rg.POST("/sites/:siteId/journal-entries", h.createJournalEntry)
	rg.DELETE("/journal-entries/:entryId", h.deleteJournalEntry)

	rg.GET("/sites/:siteId/reports/trial-balance", h.trialBalance)
	rg.GET("/sites/:siteId/reports/income-statement", h.incomeStatement)
	rg.GET("/sites/:siteId/reports/monthly-income-expense", h.monthlyIncomeExpense)
	rg.GET("/sites/:siteId/reports/balance-sheet", h.balanceSheet)

	rg.GET("/sites/:siteId/budgets", h.listBudgetComparison)
	rg.POST("/sites/:siteId/budgets", h.createBudget)
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

// --- Accounts ---

type accountRequest struct {
	Code string `json:"code" binding:"required"`
	Name string `json:"name" binding:"required"`
	Type string `json:"type" binding:"required,oneof=kasa banka gelir gider cari_alacak cari_borc diger"`
}

func (h *Handler) createAccount(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req accountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateAccount(c.Request.Context(), tenantID(c), siteID, req.Code, req.Name, req.Type)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listAccounts(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListAccounts(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateAccount(c *gin.Context) {
	accountID, ok := paramUUID(c, "accountId")
	if !ok {
		return
	}
	if err := h.service.DeactivateAccount(c.Request.Context(), tenantID(c), accountID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Journal Entries ---

type journalEntryRequest struct {
	EntryDate       string    `json:"entryDate" binding:"required"`
	Description     string    `json:"description" binding:"required"`
	DebitAccountID  uuid.UUID `json:"debitAccountId" binding:"required"`
	CreditAccountID uuid.UUID `json:"creditAccountId" binding:"required"`
	Amount          float64   `json:"amount" binding:"required,gt=0"`
}

func (h *Handler) createJournalEntry(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req journalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.DebitAccountID == req.CreditAccountID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "borç ve alacak hesabı aynı olamaz"})
		return
	}
	result, err := h.service.CreateJournalEntry(c.Request.Context(), tenantID(c), siteID, req.EntryDate, req.Description, req.DebitAccountID, req.CreditAccountID, req.Amount, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listJournalEntries(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListJournalEntries(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteJournalEntry(c *gin.Context) {
	entryID, ok := paramUUID(c, "entryId")
	if !ok {
		return
	}
	if err := h.service.DeleteJournalEntry(c.Request.Context(), tenantID(c), entryID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Reports ---

func (h *Handler) trialBalance(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.TrialBalance(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) incomeStatement(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.IncomeStatement(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) monthlyIncomeExpense(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	months, _ := strconv.Atoi(c.Query("months"))
	result, err := h.service.MonthlyIncomeExpense(c.Request.Context(), tenantID(c), siteID, months)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) balanceSheet(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.BalanceSheet(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Budgets ---

type budgetRequest struct {
	AccountID     uuid.UUID `json:"accountId" binding:"required"`
	Period        string    `json:"period" binding:"required"`
	PlannedAmount float64   `json:"plannedAmount" binding:"required,gt=0"`
}

func (h *Handler) createBudget(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req budgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateBudget(c.Request.Context(), tenantID(c), siteID, req.AccountID, req.Period, req.PlannedAmount)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listBudgetComparison(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	period := c.Query("period")
	if period == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "period parametresi zorunlu"})
		return
	}
	result, err := h.service.ListBudgetComparison(c.Request.Context(), tenantID(c), siteID, period)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
