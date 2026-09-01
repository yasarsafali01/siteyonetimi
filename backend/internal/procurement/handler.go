package procurement

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
	rg.GET("/sites/:siteId/suppliers", h.listSuppliers)
	rg.POST("/sites/:siteId/suppliers", h.createSupplier)

	rg.GET("/sites/:siteId/purchase-requests", h.listRequests)
	rg.POST("/sites/:siteId/purchase-requests", h.createRequest)
	rg.POST("/purchase-requests/:requestId/submit", h.submitRequest)
	rg.POST("/purchase-requests/:requestId/approve", h.approveRequest)
	rg.POST("/purchase-requests/:requestId/reject", h.rejectRequest)

	rg.GET("/purchase-requests/:requestId/quotes", h.listQuotes)
	rg.POST("/purchase-requests/:requestId/quotes", h.createQuote)
	rg.POST("/purchase-requests/:requestId/quotes/:quoteId/select", h.selectQuote)

	rg.GET("/sites/:siteId/purchase-orders", h.listOrders)
	rg.POST("/purchase-orders/:orderId/deliver", h.markDelivered)

	rg.GET("/purchase-orders/:orderId/invoices", h.listInvoices)
	rg.POST("/purchase-orders/:orderId/invoices", h.createInvoice)
	rg.POST("/supplier-invoices/:invoiceId/pay", h.markInvoicePaid)
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

// --- Suppliers ---

type supplierRequest struct {
	Name        string  `json:"name" binding:"required"`
	ContactName *string `json:"contactName"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
}

func (h *Handler) createSupplier(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req supplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateSupplier(c.Request.Context(), tenantID(c), siteID, req.Name, req.ContactName, req.Phone, req.Email)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listSuppliers(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListSuppliers(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Purchase Requests ---

type requestRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
}

func (h *Handler) createRequest(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req requestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateRequest(c.Request.Context(), tenantID(c), siteID, req.Title, req.Description, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listRequests(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListRequests(c.Request.Context(), tenantID(c), siteID, c.Query("status"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) submitRequest(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	result, err := h.service.SubmitRequest(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) approveRequest(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	result, err := h.service.ApproveRequest(c.Request.Context(), tenantID(c), requestID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) rejectRequest(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	result, err := h.service.RejectRequest(c.Request.Context(), tenantID(c), requestID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Quotes ---

type quoteRequest struct {
	SupplierID uuid.UUID `json:"supplierId" binding:"required"`
	Amount     float64   `json:"amount" binding:"required,gt=0"`
	Note       *string   `json:"note"`
}

func (h *Handler) createQuote(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	var req quoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateQuote(c.Request.Context(), tenantID(c), requestID, req.SupplierID, req.Amount, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listQuotes(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	result, err := h.service.ListQuotes(c.Request.Context(), tenantID(c), requestID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) selectQuote(c *gin.Context) {
	requestID, ok := paramUUID(c, "requestId")
	if !ok {
		return
	}
	quoteID, ok := paramUUID(c, "quoteId")
	if !ok {
		return
	}
	result, err := h.service.SelectQuoteAndOrder(c.Request.Context(), tenantID(c), requestID, quoteID, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

// --- Purchase Orders ---

func (h *Handler) listOrders(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListOrders(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) markDelivered(c *gin.Context) {
	orderID, ok := paramUUID(c, "orderId")
	if !ok {
		return
	}
	result, err := h.service.MarkDelivered(c.Request.Context(), tenantID(c), orderID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Supplier Invoices ---

type invoiceRequest struct {
	InvoiceNo   *string `json:"invoiceNo"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	InvoiceDate string  `json:"invoiceDate" binding:"required"`
}

func (h *Handler) createInvoice(c *gin.Context) {
	orderID, ok := paramUUID(c, "orderId")
	if !ok {
		return
	}
	var req invoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateInvoice(c.Request.Context(), tenantID(c), orderID, req.InvoiceNo, req.Amount, req.InvoiceDate)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listInvoices(c *gin.Context) {
	orderID, ok := paramUUID(c, "orderId")
	if !ok {
		return
	}
	result, err := h.service.ListInvoices(c.Request.Context(), tenantID(c), orderID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) markInvoicePaid(c *gin.Context) {
	invoiceID, ok := paramUUID(c, "invoiceId")
	if !ok {
		return
	}
	if err := h.service.MarkInvoicePaid(c.Request.Context(), tenantID(c), invoiceID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
