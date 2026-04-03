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

	r.GET("/api/v1/tenants/:slug/members", h.ListMembers)
	r.POST("/api/v1/tenants/:slug/members", h.AddMember)
	r.PUT("/api/v1/tenants/:slug/members/:userId/role", h.UpdateMemberRole)
	r.DELETE("/api/v1/tenants/:slug/members/:userId", h.RemoveMember)
}

// ---- Auth ----

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Email      string `json:"email" binding:"required"`
		Name       string `json:"name" binding:"required"`
		Password   string `json:"password" binding:"required"`
		TenantName string `json:"tenant_name"`
		TenantSlug string `json:"tenant_slug"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, resp)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.auth.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ---- Tenants ----

func (h *AuthHandler) ListTenants(c *gin.Context) {
	tenants, err := h.tenants.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tenants)
}

func (h *AuthHandler) CreateTenant(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		Slug   string `json:"slug" binding:"required"`
		Plan   string `json:"plan"`
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tenant := &domain.Tenant{Name: req.Name, Slug: req.Slug, Plan: domain.TenantPlan(req.Plan)}
	if err := h.tenants.Create(c.Request.Context(), tenant, req.UserID); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, tenant)
}

func (h *AuthHandler) GetTenant(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}
	c.JSON(http.StatusOK, tenant)
}

// ---- Members ----

func (h *AuthHandler) ListMembers(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}
	members, err := h.members.ListMembers(c.Request.Context(), tenant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, members)
}

func (h *AuthHandler) AddMember(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}
	var req struct {
		Email string `json:"email" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.members.AddMember(c.Request.Context(), tenant.ID, req.Email, domain.UserRole(req.Role)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "ok"})
}

func (h *AuthHandler) UpdateMemberRole(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}
	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.members.UpdateRole(c.Request.Context(), tenant.ID, c.Param("userId"), domain.UserRole(req.Role)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *AuthHandler) RemoveMember(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}
	if err := h.members.RemoveMember(c.Request.Context(), tenant.ID, c.Param("userId")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
