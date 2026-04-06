package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type APIGroupHandler struct{ groups service.APIGroupService }

// HandleList godoc
// @Summary 获取 API 分组列表
// @ID listGroups
// @Tags api-group
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RAPIGroupList
// @Router /v1/tenants/{slug}/projects/{projectId}/groups [get]
func (h *APIGroupHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	list, total, err := h.groups.List(c.Request.Context(), tenant.ID, pid, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleCreate godoc
// @Summary 创建 API 分组
// @ID createGroup
// @Tags api-group
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{name=string,description=string} true "分组信息"
// @Success 200 {object} RAPIGroup
// @Router /v1/tenants/{slug}/projects/{projectId}/groups [post]
func (h *APIGroupHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	g := &domain.APIGroup{TenantID: tenant.ID, ProjectID: pid, Name: req.Name, Description: req.Description}
	if err := h.groups.Create(c.Request.Context(), g); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, g)
}

// HandleUpdate godoc
// @Summary 更新 API 分组
// @ID updateGroup
// @Tags api-group
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param groupId path int true "分组ID"
// @Param body body object{name=string,description=string} true "更新信息"
// @Success 200 {object} RAPIGroup
// @Router /v1/tenants/{slug}/projects/{projectId}/groups/{groupId} [put]
func (h *APIGroupHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	gid, ok := pathInt64(c, "groupId")
	if !ok {
		return
	}
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	g := &domain.APIGroup{ID: gid, TenantID: tenant.ID, Name: req.Name, Description: req.Description}
	if err := h.groups.Update(c.Request.Context(), g); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, g)
}

// HandleDelete godoc
// @Summary 删除 API 分组
// @ID deleteGroup
// @Tags api-group
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param groupId path int true "分组ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/groups/{groupId} [delete]
func (h *APIGroupHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	gid, ok := pathInt64(c, "groupId")
	if !ok {
		return
	}
	if err := h.groups.Delete(c.Request.Context(), tenant.ID, gid); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
