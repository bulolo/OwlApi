package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type TenantHandler struct {
	tenants service.TenantService
}

// HandleMyTenants godoc
// @Summary 获取当前用户的租户列表
// @ID myTenants
// @Tags tenant
// @Security BearerAuth
// @Produce json
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RTenantList
// @Router /v1/my/tenants [get]
func (h *TenantHandler) HandleMyTenants(c *gin.Context) {
	claims := GetClaims(c)
	lp := parseListParams(c)
	var (
		tenants []*domain.Tenant
		total   int
		err     error
	)
	if claims.IsSuperAdmin {
		tenants, total, err = h.tenants.List(c.Request.Context(), lp)
	} else {
		tenants, total, err = h.tenants.ListByUser(c.Request.Context(), claims.UserID, lp)
	}
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, tenants, lp, total)
}

// HandleListTenants godoc
// @Summary 获取所有租户 (SuperAdmin)
// @ID listAllTenants
// @Tags tenant
// @Security BearerAuth
// @Produce json
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RTenantList
// @Router /v1/tenants [get]
func (h *TenantHandler) HandleListTenants(c *gin.Context) {
	lp := parseListParams(c)
	tenants, total, err := h.tenants.List(c.Request.Context(), lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, tenants, lp, total)
}

// HandleCreateTenant godoc
// @Summary 创建租户 (SuperAdmin)
// @ID createTenant
// @Tags tenant
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body object{name=string,slug=string,plan=string} true "租户信息"
// @Success 200 {object} RTenant
// @Router /v1/tenants [post]
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
		FailErr(c, err)
		return
	}
	OK(c, tenant)
}

// HandleGetTenant godoc
// @Summary 获取租户详情
// @ID getTenant
// @Tags tenant
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Success 200 {object} RTenant
// @Router /v1/tenants/{slug} [get]
func (h *TenantHandler) HandleGetTenant(c *gin.Context) {
	OK(c, GetTenant(c))
}

// HandleUpdateTenant godoc
// @Summary 更新租户 (SuperAdmin)
// @ID updateTenant
// @Tags tenant
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{name=string,plan=string,status=string} true "更新信息"
// @Success 200 {object} RTenant
// @Router /v1/tenants/{slug} [put]
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
		FailErr(c, err)
		return
	}
	OK(c, tenant)
}

// HandleDeleteTenant godoc
// @Summary 删除租户 (SuperAdmin)
// @ID deleteTenant
// @Tags tenant
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Success 200 {object} R
// @Router /v1/tenants/{slug} [delete]
func (h *TenantHandler) HandleDeleteTenant(c *gin.Context) {
	if err := h.tenants.Delete(c.Request.Context(), c.Param("slug")); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
