package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type AuthHandler struct {
	auth    service.AuthService
	tenants service.TenantService
	members service.MemberService
}

func NewAuthHandler(auth service.AuthService, tenants service.TenantService, members service.MemberService) *AuthHandler {
	return &AuthHandler{auth: auth, tenants: tenants, members: members}
}

func (h *AuthHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/v1/auth/register", h.Register)
	r.POST("/api/v1/auth/login", h.Login)

	r.GET("/api/v1/tenants", h.ListTenants)
	r.POST("/api/v1/tenants", h.CreateTenant)
	r.GET("/api/v1/tenants/:slug", h.GetTenant)
	r.PUT("/api/v1/tenants/:slug", h.UpdateTenant)
	r.DELETE("/api/v1/tenants/:slug", h.DeleteTenant)

	r.GET("/api/v1/tenants/:slug/members", h.ListMembers)
	r.POST("/api/v1/tenants/:slug/members", h.AddMember)
	r.PUT("/api/v1/tenants/:slug/members/:userId/role", h.UpdateMemberRole)
	r.DELETE("/api/v1/tenants/:slug/members/:userId", h.RemoveMember)
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
	var req struct {
		Name   string `json:"name" binding:"required"`
		Slug   string `json:"slug" binding:"required"`
		Plan   string `json:"plan"`
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	tenant := &domain.Tenant{Name: req.Name, Slug: req.Slug, Plan: domain.TenantPlan(req.Plan)}
	if err := h.tenants.Create(c.Request.Context(), tenant, req.UserID); err != nil {
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

// ==================== Members ====================

func (h *AuthHandler) ListMembers(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	page, size, isPager := parsePage(c)
	if !isPager {
		members, total, err := h.members.ListMembers(c.Request.Context(), tenant.ID, 1, 10000)
		if err != nil {
			Fail(c, http.StatusInternalServerError, err.Error())
			return
		}
		OK(c, gin.H{"list": members, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
		return
	}
	members, total, err := h.members.ListMembers(c.Request.Context(), tenant.ID, page, size)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OKPaged(c, members, page, size, total)
}

func (h *AuthHandler) AddMember(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.members.AddMember(c.Request.Context(), tenant.ID, req.Email, domain.UserRole(req.Role)); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	OK(c, nil)
}

func (h *AuthHandler) UpdateMemberRole(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.members.UpdateRole(c.Request.Context(), tenant.ID, c.Param("userId"), domain.UserRole(req.Role)); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}

func (h *AuthHandler) RemoveMember(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	if err := h.members.RemoveMember(c.Request.Context(), tenant.ID, c.Param("userId")); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
