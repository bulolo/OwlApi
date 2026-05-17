package http

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pkg/auth"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

// RequestID injects a unique request ID into every request context and response header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			b := make([]byte, 8)
			if _, err := rand.Read(b); err == nil {
				id = hex.EncodeToString(b)
			}
		}
		c.Set("request_id", id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

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
// Precondition: JWTAuth middleware must be applied to this route.
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

// DemoGuard blocks write operations (POST/PUT/DELETE) for tenants on the Demo plan.
// SuperAdmins bypass this check so they can still manage demo tenants.
func DemoGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodGet {
			c.Next()
			return
		}
		claims := GetClaims(c)
		if claims != nil && claims.IsSuperAdmin {
			c.Next()
			return
		}
		tenant := GetTenant(c)
		if tenant != nil && tenant.Plan == domain.PlanDemo {
			Fail(c, http.StatusForbidden, "演示模式，暂不支持此操作")
			c.Abort()
			return
		}
		c.Next()
	}
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
func RequireTenantRole(authz service.AuthorizationService, minRole domain.UserRole) gin.HandlerFunc {
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
				tenant, err := authz.GetTenantBySlug(c.Request.Context(), slug)
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
		tenant, err := authz.GetTenantBySlug(c.Request.Context(), slug)
		if err != nil {
			Fail(c, http.StatusNotFound, "tenant not found")
			c.Abort()
			return
		}
		tu, err := authz.GetTenantUser(c.Request.Context(), tenant.ID, claims.UserID)
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
