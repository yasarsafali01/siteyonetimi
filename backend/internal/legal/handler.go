package legal

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
	rg.GET("/lawyers", h.listLawyers)
	rg.POST("/lawyers", h.createLawyer)

	rg.GET("/sites/:siteId/legal-cases", h.listCases)
	rg.POST("/sites/:siteId/legal-cases", h.createCase)
	rg.POST("/legal-cases/:caseId/status", h.setCaseStatus)

	rg.GET("/legal-cases/:caseId/documents", h.listDocuments)
	rg.POST("/legal-cases/:caseId/documents", h.addDocument)
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

// --- Lawyers ---

type lawyerRequest struct {
	FullName       string  `json:"fullName" binding:"required"`
	Phone          *string `json:"phone"`
	Email          *string `json:"email"`
	BarAssociation *string `json:"barAssociation"`
}

func (h *Handler) createLawyer(c *gin.Context) {
	var req lawyerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateLawyer(c.Request.Context(), tenantID(c), req.FullName, req.Phone, req.Email, req.BarAssociation)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listLawyers(c *gin.Context) {
	result, err := h.service.ListLawyers(c.Request.Context(), tenantID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Cases ---

type caseRequest struct {
	UnitID      *uuid.UUID `json:"unitId"`
	PersonID    *uuid.UUID `json:"personId"`
	LawyerID    *uuid.UUID `json:"lawyerId"`
	CaseType    string     `json:"caseType" binding:"required,oneof=icra dava diger"`
	CaseNo      *string    `json:"caseNo"`
	Title       string     `json:"title" binding:"required"`
	Description *string    `json:"description"`
	Amount      *float64   `json:"amount"`
}

func (h *Handler) createCase(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req caseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateCase(c.Request.Context(), tenantID(c), siteID, req.UnitID, req.PersonID, req.LawyerID, req.CaseType, req.CaseNo, req.Title, req.Description, req.Amount, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listCases(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListCases(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type caseStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=acik devam_ediyor kapandi"`
}

func (h *Handler) setCaseStatus(c *gin.Context) {
	caseID, ok := paramUUID(c, "caseId")
	if !ok {
		return
	}
	var req caseStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.SetCaseStatus(c.Request.Context(), tenantID(c), caseID, req.Status)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Documents ---

type legalDocumentRequest struct {
	Title   string `json:"title" binding:"required"`
	FileURL string `json:"fileUrl" binding:"required"`
}

func (h *Handler) addDocument(c *gin.Context) {
	caseID, ok := paramUUID(c, "caseId")
	if !ok {
		return
	}
	var req legalDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.AddDocument(c.Request.Context(), tenantID(c), caseID, req.Title, req.FileURL, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listDocuments(c *gin.Context) {
	caseID, ok := paramUUID(c, "caseId")
	if !ok {
		return
	}
	result, err := h.service.ListDocuments(c.Request.Context(), tenantID(c), caseID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
