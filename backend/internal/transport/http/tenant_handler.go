package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
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
	t := GetTenant(c)
	// is_demo 委托已注册的 demoChecker 判定；未注册（默认）→ false。
	if t != nil && demoChecker != nil {
		t.IsDemo = demoChecker(c.Request.Context(), t.ID)
	}
	OK(c, t)
}

// HandleUpdateTenantSettings godoc
// @Summary 更新租户配置（租户管理员）
// @ID updateTenantSettings
// @Tags tenant
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{max_release_versions=int} true "配置项"
// @Success 200 {object} RTenant
// @Router /v1/tenants/{slug}/settings [put]
func (h *TenantHandler) HandleUpdateTenantSettings(c *gin.Context) {
	var req struct {
		MaxReleaseVersions int    `json:"max_release_versions"`
		Avatar             string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	tenant, err := h.tenants.UpdateSettings(c.Request.Context(), c.Param("slug"), req.MaxReleaseVersions, req.Avatar)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, tenant)
}
