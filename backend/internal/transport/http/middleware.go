package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pkg/auth"
)

const (
	ctxClaims = "claims"
	ctxTenant = "tenant"
)

// JWTAuth extracts and validates the Bearer token, sets claims in context.
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			Fail(c, http.StatusUnauthorized, "missing or invalid token")
			c.Abort()
			return
		}
		claims, err := auth.ParseToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			Fail(c, http.StatusUnauthorized, "invalid or expired token")
			c.Abort()
			return
		}
		c.Set(ctxClaims, claims)
		c.Next()
	}
}

// GetClaims returns the JWT claims from gin context.
func GetClaims(c *gin.Context) *auth.Claims {
	v, _ := c.Get(ctxClaims)
	claims, _ := v.(*auth.Claims)
	return claims
}

// GetTenant returns the tenant set by RequireTenantRole middleware.
func GetTenant(c *gin.Context) *domain.Tenant {
	v, _ := c.Get(ctxTenant)
	t, _ := v.(*domain.Tenant)
	return t
}

// RequireSuperAdmin allows only super admins.
func RequireSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil || !claims.IsSuperAdmin {
			Fail(c, http.StatusForbidden, "super admin required")
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireTenantRole checks the user has at least the given role in the tenant identified by :slug.
// It needs a TenantUserRepository to look up the user's role.
func RequireTenantRole(tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository, minRole domain.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			Fail(c, http.StatusUnauthorized, "unauthorized")
			c.Abort()
			return
		}
		// SuperAdmin bypasses tenant role check but still needs tenant in context
		if claims.IsSuperAdmin {
			slug := c.Param("slug")
			if slug != "" {
				tenant, err := tenants.GetBySlug(c.Request.Context(), slug)
				if err != nil {
					Fail(c, http.StatusNotFound, "tenant not found")
					c.Abort()
					return
				}
				c.Set(ctxTenant, tenant)
			}
			c.Next()
			return
		}
		slug := c.Param("slug")
		if slug == "" {
			Fail(c, http.StatusBadRequest, "missing tenant slug")
			c.Abort()
			return
		}
		tenant, err := tenants.GetBySlug(c.Request.Context(), slug)
		if err != nil {
			Fail(c, http.StatusNotFound, "tenant not found")
			c.Abort()
			return
		}
		tu, err := tenantUsers.GetByTenantAndUser(c.Request.Context(), tenant.ID, claims.UserID)
		if err != nil {
			Fail(c, http.StatusForbidden, "not a user of this tenant")
			c.Abort()
			return
		}
		if !roleAtLeast(tu.Role, minRole) {
			Fail(c, http.StatusForbidden, "insufficient permissions")
			c.Abort()
			return
		}
		c.Set(ctxTenant, tenant)
		c.Next()
	}
}

// roleAtLeast returns true if actual >= required (Admin > Viewer).
func roleAtLeast(actual, required domain.UserRole) bool {
	rank := func(r domain.UserRole) int {
		switch r {
		case domain.RoleAdmin:
			return 2
		case domain.RoleViewer:
			return 1
		default:
			return 0
		}
	}
	return rank(actual) >= rank(required)
}
