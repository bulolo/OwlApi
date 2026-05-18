package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type EnvironmentHandler struct{ envs service.EnvironmentService }

type createEnvReq struct {
	Name          string `json:"name"            binding:"required"`
	IsDefault     bool   `json:"is_default"`
	CopyFromEnvID int64  `json:"copy_from_env_id"`
	CopyBindings  bool   `json:"copy_bindings"`
}

type renameEnvReq struct {
	Name string `json:"name" binding:"required"`
}

type upsertBindingReq struct {
	Alias        string `json:"alias"         binding:"required"`
	DataSourceID int64  `json:"datasource_id" binding:"required"`
}

type renameAliasReq struct {
	OldAlias string `json:"old_alias" binding:"required"`
	NewAlias string `json:"new_alias" binding:"required"`
}

// HandleList godoc
// @Summary 获取项目环境列表
// @ID listProjectEnvironments
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments [get]
func (h *EnvironmentHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	list, err := h.envs.List(c.Request.Context(), tenant.ID, projectID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, list)
}

// HandleCreate godoc
// @Summary 创建项目环境
// @ID createProjectEnvironment
// @Tags environment
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body createEnvReq true "环境信息"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments [post]
func (h *EnvironmentHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req createEnvReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	env, err := h.envs.Create(c.Request.Context(), tenant.ID, projectID, req.Name, req.IsDefault, req.CopyFromEnvID, req.CopyBindings)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, env)
}

// HandleRename godoc
// @Summary 重命名环境
// @ID renameProjectEnvironment
// @Tags environment
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Param body body renameEnvReq true "新名称"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId} [put]
func (h *EnvironmentHandler) HandleRename(c *gin.Context) {
	tenant := GetTenant(c)
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	var req renameEnvReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.envs.Rename(c.Request.Context(), tenant.ID, envID, req.Name); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleSetDefault godoc
// @Summary 设置默认环境
// @ID setDefaultProjectEnvironment
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId}/default [post]
func (h *EnvironmentHandler) HandleSetDefault(c *gin.Context) {
	tenant := GetTenant(c)
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	if err := h.envs.SetDefault(c.Request.Context(), tenant.ID, projectID, envID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleDelete godoc
// @Summary 删除环境
// @ID deleteProjectEnvironment
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId} [delete]
func (h *EnvironmentHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	if err := h.envs.Delete(c.Request.Context(), tenant.ID, envID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleListBindings godoc
// @Summary 获取项目所有 env 的 alias 绑定（用于编辑器解析弹窗）
// @ID listProjectBindings
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/bindings [get]
func (h *EnvironmentHandler) HandleListBindings(c *gin.Context) {
	tenant := GetTenant(c)
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	list, err := h.envs.ListBindingsByProject(c.Request.Context(), tenant.ID, projectID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, list)
}

// HandleListEnvBindings godoc
// @Summary 获取单个环境的 binding 列表
// @ID listEnvBindings
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId}/bindings [get]
func (h *EnvironmentHandler) HandleListEnvBindings(c *gin.Context) {
	tenant := GetTenant(c)
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	list, err := h.envs.ListBindings(c.Request.Context(), tenant.ID, envID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, list)
}

// HandleUpsertBinding godoc
// @Summary 新增/更新一个 alias 绑定
// @ID upsertEnvBinding
// @Tags environment
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Param body body upsertBindingReq true "binding"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId}/bindings [post]
func (h *EnvironmentHandler) HandleUpsertBinding(c *gin.Context) {
	tenant := GetTenant(c)
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	var req upsertBindingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.envs.UpsertBinding(c.Request.Context(), tenant.ID, envID, req.Alias, req.DataSourceID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleDeleteBinding godoc
// @Summary 删除一个 alias 绑定
// @ID deleteEnvBinding
// @Tags environment
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param envId path int true "环境ID"
// @Param alias path string true "别名"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/environments/{envId}/bindings/{alias} [delete]
func (h *EnvironmentHandler) HandleDeleteBinding(c *gin.Context) {
	tenant := GetTenant(c)
	envID, ok := pathInt64(c, "envId")
	if !ok {
		return
	}
	alias := c.Param("alias")
	if err := h.envs.DeleteBinding(c.Request.Context(), tenant.ID, envID, alias); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleRenameAlias godoc
// @Summary 跨 env 重命名 alias
// @ID renameProjectAlias
// @Tags environment
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body renameAliasReq true "old/new alias"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/aliases/rename [post]
func (h *EnvironmentHandler) HandleRenameAlias(c *gin.Context) {
	tenant := GetTenant(c)
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req renameAliasReq
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.envs.RenameAlias(c.Request.Context(), tenant.ID, projectID, req.OldAlias, req.NewAlias); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
