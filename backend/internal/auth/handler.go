package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// middleware.RequireAuth ile aynı context anahtarları — burada tekrarlanır çünkü
// middleware paketi zaten auth paketini import ediyor (import cycle önlenir).
const (
	contextKeyTenantID     = "tenantID"
	contextKeyIsSuperAdmin = "isSuperAdmin"
	contextKeyUserType     = "userType"
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

// RegisterProtectedRoutes, giriş yapmış kullanıcı gerektiren kullanıcı yönetimi
// rotalarını kaydeder (ek yönetici/sakin hesabı oluşturma, hesap listesi).
func (h *Handler) RegisterProtectedRoutes(rg *gin.RouterGroup) {
	rg.GET("/users", h.listUsers)
	rg.POST("/users", h.createUser)
}

func tenantID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(contextKeyTenantID)
	id, _ := v.(uuid.UUID)
	return id
}

func userType(c *gin.Context) string {
	v, _ := c.Get(contextKeyUserType)
	s, _ := v.(string)
	return s
}

// requireYonetici, sakin tipi kullanıcıların hesap yönetimi endpoint'lerine erişimini engeller.
func requireYonetici(c *gin.Context) bool {
	if isSA, _ := c.Get(contextKeyIsSuperAdmin); isSA == true {
		return true
	}
	if userType(c) == "sakin" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
		return false
	}
	return true
}

type createUserRequest struct {
	Email    string     `json:"email" binding:"required,email"`
	Password string     `json:"password" binding:"required,min=8"`
	FullName string     `json:"fullName" binding:"required"`
	UserType string     `json:"userType" binding:"required,oneof=yonetici sakin"`
	PersonID *uuid.UUID `json:"personId"`
}

func (h *Handler) createUser(c *gin.Context) {
	if !requireYonetici(c) {
		return
	}
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateUser(c.Request.Context(), tenantID(c), req.Email, req.Password, req.FullName, req.UserType, req.PersonID)
	if err != nil {
		switch {
		case errors.Is(err, ErrPersonNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, ErrPersonHasLogin), errors.Is(err, ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "kullanıcı oluşturulamadı"})
		}
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listUsers(c *gin.Context) {
	if !requireYonetici(c) {
		return
	}
	result, err := h.service.ListUsers(c.Request.Context(), tenantID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
		return
	}
	c.JSON(http.StatusOK, result)
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
