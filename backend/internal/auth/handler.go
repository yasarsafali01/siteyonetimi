package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/register-tenant", h.registerTenant)
	rg.POST("/login", h.login)
	rg.POST("/refresh", h.refresh)
}

type registerTenantRequest struct {
	CompanyName string `json:"companyName" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	FullName    string `json:"fullName" binding:"required"`
}

func (h *Handler) registerTenant(c *gin.Context) {
	var req registerTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID, err := h.service.RegisterTenant(c.Request.Context(), req.CompanyName, req.Email, req.Password, req.FullName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tenant oluşturulamadı"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"tenantId": tenantID})
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.service.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "giriş başarısız"})
		return
	}

	c.JSON(http.StatusOK, tokens)
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

func (h *Handler) refresh(c *gin.Context) {
	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.service.RefreshAccessToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, ErrInvalidRefreshToken) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token yenilenemedi"})
		return
	}

	c.JSON(http.StatusOK, tokens)
}
