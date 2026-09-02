package survey

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
	rg.GET("/sites/:siteId/surveys", h.listSurveys)
	rg.POST("/sites/:siteId/surveys", h.createSurvey)
	rg.GET("/surveys/:surveyId/options", h.listOptions)
	rg.POST("/surveys/:surveyId/activate", h.activateSurvey)
	rg.POST("/surveys/:surveyId/close", h.closeSurvey)
	rg.POST("/surveys/:surveyId/vote", h.vote)
	rg.GET("/surveys/:surveyId/results", h.results)
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
	case errors.Is(err, ErrNotActive):
		c.JSON(http.StatusBadRequest, gin.H{"error": "anket aktif değil"})
	case errors.Is(err, ErrAlreadyVoted):
		c.JSON(http.StatusConflict, gin.H{"error": "bu birim bu ankette zaten oy kullandı"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
	}
}

type surveyRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description *string  `json:"description"`
	Type        string   `json:"type" binding:"required,oneof=anket genel_kurul_oylamasi"`
	Options     []string `json:"options" binding:"required,min=2"`
}

func (h *Handler) createSurvey(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req surveyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sv, options, err := h.service.CreateSurvey(c.Request.Context(), tenantID(c), siteID, req.Title, req.Description, req.Type, req.Options, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"survey": sv, "options": options})
}

func (h *Handler) listSurveys(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListSurveys(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) listOptions(c *gin.Context) {
	surveyID, ok := paramUUID(c, "surveyId")
	if !ok {
		return
	}
	result, err := h.service.ListOptions(c.Request.Context(), tenantID(c), surveyID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) activateSurvey(c *gin.Context) {
	surveyID, ok := paramUUID(c, "surveyId")
	if !ok {
		return
	}
	result, err := h.service.SetStatus(c.Request.Context(), tenantID(c), surveyID, "aktif")
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) closeSurvey(c *gin.Context) {
	surveyID, ok := paramUUID(c, "surveyId")
	if !ok {
		return
	}
	result, err := h.service.SetStatus(c.Request.Context(), tenantID(c), surveyID, "kapali")
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type voteRequest struct {
	OptionID uuid.UUID  `json:"optionId" binding:"required"`
	UnitID   uuid.UUID  `json:"unitId" binding:"required"`
	PersonID *uuid.UUID `json:"personId"`
}

func (h *Handler) vote(c *gin.Context) {
	surveyID, ok := paramUUID(c, "surveyId")
	if !ok {
		return
	}
	var req voteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.Vote(c.Request.Context(), tenantID(c), surveyID, req.OptionID, req.UnitID, req.PersonID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) results(c *gin.Context) {
	surveyID, ok := paramUUID(c, "surveyId")
	if !ok {
		return
	}
	result, err := h.service.Results(c.Request.Context(), tenantID(c), surveyID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
