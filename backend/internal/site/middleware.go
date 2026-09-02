package site

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"siteyonetimi/backend/internal/middleware"
)

// RequireSiteAccess, URL'de :siteId parametresi bulunan her rotada çağıran
// kullanıcının o siteye erişim yetkisi olup olmadığını kontrol eder.
// Süper adminler her siteye erişebilir. Sakin kullanıcılar bu kontrolden muaftır —
// onların erişimi zaten kendi bağımsız bölümleriyle (residency) sınırlıdır ve ayrı
// bir mekanizmayla (unit/person id) doğrulanır.
// :siteId parametresi taşımayan rotalarda (ör. /auth/me, /blocks/:blockId) hiçbir
// şey yapmaz — bu durumda site erişimi ilgili modülün kendi mantığına bırakılır.
func RequireSiteAccess(service *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		siteIDParam := c.Param("siteId")
		if siteIDParam == "" {
			c.Next()
			return
		}

		if v, _ := c.Get(middleware.ContextKeyIsSuperAdmin); v == true {
			c.Next()
			return
		}
		if v, _ := c.Get(middleware.ContextKeyUserType); v == "sakin" {
			c.Next()
			return
		}

		siteID, err := uuid.Parse(siteIDParam)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "geçersiz site id"})
			return
		}

		tenantIDVal, _ := c.Get(middleware.ContextKeyTenantID)
		tid, _ := tenantIDVal.(uuid.UUID)
		userIDVal, _ := c.Get(middleware.ContextKeyUserID)
		uid, _ := userIDVal.(uuid.UUID)

		hasAccess, err := service.UserHasSiteAccess(c.Request.Context(), tid, uid, siteID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
			return
		}
		if !hasAccess {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "bu siteye erişim yetkiniz yok"})
			return
		}
		c.Next()
	}
}
