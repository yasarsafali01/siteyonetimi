package rbac

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"

	"siteyonetimi/backend/internal/middleware"
)

// RequirePermission verilen izin koduna sahip olmayan istekleri reddeder.
// Süper admin her zaman geçer. RequireAuth middleware'inden sonra kullanılmalıdır.
func RequirePermission(code string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if isSuperAdmin, _ := c.Get(middleware.ContextKeyIsSuperAdmin); isSuperAdmin == true {
			c.Next()
			return
		}

		permsValue, exists := c.Get(middleware.ContextKeyPermissions)
		perms, _ := permsValue.([]string)
		if !exists || !slices.Contains(perms, code) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "bu işlem için yetkiniz yok"})
			return
		}
		c.Next()
	}
}
