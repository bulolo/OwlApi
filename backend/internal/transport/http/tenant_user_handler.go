package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type TenantUserHandler struct {
	tenants     service.TenantService
	tenantUsers service.TenantUserService
}

func (h *TenantUserHandler) HandleList(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	page, size, isPager := parsePage(c)
	if !isPager {
		users, total, err := h.tenantUsers.List(c.Request.Context(), tenant.ID, 1, 10000)
		if err != nil {
			Fail(c, http.StatusInternalServerError, err.Error())
			return
		}
		OK(c, gin.H{"list": users, "pagination": PaginationInfo{IsPager: 0, Page: 1, Size: total, Total: total}})
		return
	}
	users, total, err := h.tenantUsers.List(c.Request.Context(), tenant.ID, page, size)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OKPaged(c, users, page, size, total)
}

func (h *TenantUserHandler) HandleCreate(c *gin.Context) {
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
	if err := h.tenantUsers.Create(c.Request.Context(), tenant.ID, service.AddTenantUserRequest{
		Email: req.Email, Name: req.Name, Password: req.Password, Role: domain.UserRole(req.Role),
	}); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	OK(c, nil)
}

func (h *TenantUserHandler) HandleUpdateRole(c *gin.Context) {
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
	if err := h.tenantUsers.UpdateRole(c.Request.Context(), tenant.ID, userID, domain.UserRole(req.Role)); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}

func (h *TenantUserHandler) HandleDelete(c *gin.Context) {
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
	if err := h.tenantUsers.Delete(c.Request.Context(), tenant.ID, userID); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
