package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type TenantHandler struct {
	tenants service.TenantService
}

func (h *TenantHandler) HandleMyTenants(c *gin.Context) {
	claims := GetClaims(c)
	if claims.IsSuperAdmin {
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

func (h *TenantHandler) HandleListTenants(c *gin.Context) {
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

func (h *TenantHandler) HandleCreateTenant(c *gin.Context) {
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

func (h *TenantHandler) HandleGetTenant(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	OK(c, tenant)
}

func (h *TenantHandler) HandleUpdateTenant(c *gin.Context) {
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

func (h *TenantHandler) HandleDeleteTenant(c *gin.Context) {
	if err := h.tenants.Delete(c.Request.Context(), c.Param("slug")); err != nil {
		Fail(c, http.StatusNotFound, err.Error())
		return
	}
	OK(c, nil)
}
