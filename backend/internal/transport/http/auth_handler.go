package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type AuthHandler struct {
	auth        service.AuthService
	tenants     service.TenantService
	tenantUsers service.TenantUserService
}

func NewAuthHandler(auth service.AuthService, tenants service.TenantService, tenantUsers service.TenantUserService) *AuthHandler {
	return &AuthHandler{auth: auth, tenants: tenants, tenantUsers: tenantUsers}
}

func (h *AuthHandler) RegisterRoutes(r *gin.Engine, tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository) {
	// Public
	r.POST("/api/v1/auth/register", h.Register)
	r.POST("/api/v1/auth/login", h.Login)

	// Authenticated
	authed := r.Group("", JWTAuth())

	// Current user's tenants
	authed.GET("/api/v1/my/tenants", h.MyTenants)

	// Tenant CRUD — SuperAdmin only
	sa := authed.Group("", RequireSuperAdmin())
	sa.GET("/api/v1/tenants", h.ListTenants)
	sa.POST("/api/v1/tenants", h.CreateTenant)
	sa.PUT("/api/v1/tenants/:slug", h.UpdateTenant)
	sa.DELETE("/api/v1/tenants/:slug", h.DeleteTenant)

	// Tenant read — any authenticated user (viewer+)
	viewer := authed.Group("", RequireTenantRole(tenants, tenantUsers, domain.RoleViewer))
	viewer.GET("/api/v1/tenants/:slug", h.GetTenant)
	viewer.GET("/api/v1/tenants/:slug/users", h.ListTenantUsers)

	// Tenant user management — Admin+
	admin := authed.Group("", RequireTenantRole(tenants, tenantUsers, domain.RoleAdmin))
	admin.POST("/api/v1/tenants/:slug/users", h.AddTenantUser)
	admin.PUT("/api/v1/tenants/:slug/users/:userId/role", h.UpdateTenantUserRole)
	admin.DELETE("/api/v1/tenants/:slug/users/:userId", h.RemoveTenantUser)
}

// ==================== Auth ====================

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Email      string `json:"email" binding:"required"`
		Name       string `json:"name" binding:"required"`
		Password   string `json:"password" binding:"required"`
		TenantName string `json:"tenant_name"`
		TenantSlug string `json:"tenant_slug"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	resp, err := h.auth.Register(c.Request.Context(), service.RegisterRequest{
		Email:      req.Email,
		Name:       req.Name,
		Password:   req.Password,
		TenantName: req.TenantName,
		TenantSlug: req.TenantSlug,
	})
	if err != nil {
		Fail(c, http.StatusConflict, err.Error())
		return
	}
	OK(c, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	resp, err := h.auth.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		Fail(c, http.StatusUnauthorized, err.Error())
		return
	}
	OK(c, resp)
}

// ==================== Tenants ====================

func (h *AuthHandler) MyTenants(c *gin.Context) {
	claims := GetClaims(c)
	if claims.IsSuperAdmin {
		// SuperAdmin sees all tenants
		tenants, total, err := h.tenants.List(c.Request.Context(), 1, 10000)
		if err != nil {
			Fail(c, http.StatusInternalServerError, err.Error())
			return
		}
		OK(c, gin.H{"list": tenants, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
		return
	}
	tenants, err := h.tenants.ListByUser(c.Request.Context(), claims.UserID)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	total := len(tenants)
	OK(c, gin.H{"list": tenants, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
}

func (h *AuthHandler) ListTenants(c *gin.Context) {
	page, size, isPager := parsePage(c)
	if !isPager {
		tenants, total, err := h.tenants.List(c.Request.Context(), 1, 10000)
		if err != nil {
			Fail(c, http.StatusInternalServerError, err.Error())
			return
		}
		OK(c, gin.H{"list": tenants, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
		return
	}
	tenants, total, err := h.tenants.List(c.Request.Context(), page, size)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OKPaged(c, tenants, page, size, total)
}

func (h *AuthHandler) CreateTenant(c *gin.Context) {
	claims := GetClaims(c)
	var req struct {
		Name string `json:"name" binding:"required"`
		Slug string `json:"slug" binding:"required"`
		Plan string `json:"plan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	tenant := &domain.Tenant{Name: req.Name, Slug: req.Slug, Plan: domain.TenantPlan(req.Plan)}
	if err := h.tenants.Create(c.Request.Context(), tenant, claims.UserID); err != nil {
		Fail(c, http.StatusConflict, err.Error())
		return
	}
	OK(c, tenant)
}

func (h *AuthHandler) GetTenant(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	OK(c, tenant)
}

func (h *AuthHandler) UpdateTenant(c *gin.Context) {
	var req struct {
		Name   string `json:"name"`
		Plan   string `json:"plan"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	tenant, err := h.tenants.Update(c.Request.Context(), c.Param("slug"), req.Name, req.Plan, req.Status)
	if err != nil {
		Fail(c, http.StatusNotFound, err.Error())
		return
	}
	OK(c, tenant)
}

func (h *AuthHandler) DeleteTenant(c *gin.Context) {
	if err := h.tenants.Delete(c.Request.Context(), c.Param("slug")); err != nil {
		Fail(c, http.StatusNotFound, err.Error())
		return
	}
	OK(c, nil)
}

// ==================== Users ====================

func (h *AuthHandler) ListTenantUsers(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	page, size, isPager := parsePage(c)
	if !isPager {
		users, total, err := h.tenantUsers.ListTenantUsers(c.Request.Context(), tenant.ID, 1, 10000)
		if err != nil {
			Fail(c, http.StatusInternalServerError, err.Error())
			return
		}
		OK(c, gin.H{"list": users, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
		return
	}
	users, total, err := h.tenantUsers.ListTenantUsers(c.Request.Context(), tenant.ID, page, size)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OKPaged(c, users, page, size, total)
}

func (h *AuthHandler) AddTenantUser(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Email    string `json:"email" binding:"required"`
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.tenantUsers.AddTenantUser(c.Request.Context(), tenant.ID, service.AddTenantUserRequest{
		Email: req.Email, Name: req.Name, Password: req.Password, Role: domain.UserRole(req.Role),
	}); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	OK(c, nil)
}

func (h *AuthHandler) UpdateTenantUserRole(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	userID, err := strconv.ParseInt(c.Param("userId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.tenantUsers.UpdateTenantUserRole(c.Request.Context(), tenant.ID, userID, domain.UserRole(req.Role)); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}

func (h *AuthHandler) RemoveTenantUser(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	userID, err := strconv.ParseInt(c.Param("userId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid user id")
		return
	}
	if err := h.tenantUsers.RemoveTenantUser(c.Request.Context(), tenant.ID, userID); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
