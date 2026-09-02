package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"siteyonetimi/backend/internal/auth"
)

const (
	ContextKeyUserID       = "userID"
	ContextKeyTenantID     = "tenantID"
	ContextKeyIsSuperAdmin = "isSuperAdmin"
	ContextKeyPermissions  = "permissions"
	ContextKeyUserType     = "userType"
	ContextKeyPersonID     = "personID"
)

// RequireAuth Authorization: Bearer <token> başlığını doğrular ve claim'leri context'e yazar.
func RequireAuth(accessSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "yetkilendirme başlığı eksik"})
			return
		}

		tokenString := strings.TrimPrefix(header, "Bearer ")
		claims, err := auth.ParseAccessToken(accessSecret, tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "geçersiz veya süresi dolmuş token"})
			return
		}

		c.Set(ContextKeyUserID, claims.UserID)
		c.Set(ContextKeyTenantID, claims.TenantID)
		c.Set(ContextKeyIsSuperAdmin, claims.IsSuperAdmin)
		c.Set(ContextKeyPermissions, claims.Permissions)
		c.Set(ContextKeyUserType, claims.UserType)
		if claims.PersonID != nil {
			c.Set(ContextKeyPersonID, *claims.PersonID)
		}
		c.Next()
	}
}
