package http

import (
	"net/http"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type ProjectHandler struct {
	projects service.ProjectService
}

// HandleList godoc
// @Summary 获取项目列表
// @ID listProjects
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RProjectList
// @Router /v1/tenants/{slug}/projects [get]
func (h *ProjectHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	lp := parseListParams(c)
	list, total, err := h.projects.List(c.Request.Context(), tenant.ID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleCreate godoc
// @Summary 创建项目
// @ID createProject
// @Tags project
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param body body object{slug=string,name=string,description=string,env=string,datasource_id=int} true "项目信息（env：初始环境名，默认 prod；datasource_id：为初始环境的 main 别名绑定的数据源，可选）"
// @Success 200 {object} RProject
// @Router /v1/tenants/{slug}/projects [post]
func (h *ProjectHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		Slug         string `json:"slug" binding:"required"`
		Name         string `json:"name" binding:"required"`
		Description  string `json:"description"`
		Avatar       string `json:"avatar"`
		Env          string `json:"env"`
		DatasourceID int64  `json:"datasource_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	envName := strings.ToLower(strings.TrimSpace(req.Env))
	if envName == "" {
		envName = "prod" // 兜底：未指定仍建 prod
	}
	p := &domain.Project{TenantID: tenant.ID, Slug: req.Slug, Name: req.Name, Description: req.Description, Avatar: req.Avatar}
	// 原子创建：项目 + 初始默认环境 + （可选）为该环境的 main 别名绑定数据源。
	// 三步同事务，失败整体回滚，绝不会留下「无环境」或「无绑定」的半成品项目。
	if err := h.projects.CreateWithInitialEnv(c.Request.Context(), p, envName, req.DatasourceID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, p)
}

// HandleGet godoc
// @Summary 获取项目详情
// @ID getProject
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} RProject
// @Router /v1/tenants/{slug}/projects/{projectId} [get]
func (h *ProjectHandler) HandleGet(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	p, err := h.projects.GetByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, p)
}

// HandleUpdate godoc
// @Summary 更新项目
// @ID updateProject
// @Tags project
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{name=string,description=string} true "更新信息"
// @Success 200 {object} RProject
// @Router /v1/tenants/{slug}/projects/{projectId} [put]
func (h *ProjectHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	p, err := h.projects.GetByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, err)
		return
	}
	var req struct {
		Slug        string `json:"slug"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Avatar      string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Slug != "" {
		p.Slug = req.Slug
	}
	if req.Name != "" {
		p.Name = req.Name
	}
	if req.Description != "" {
		p.Description = req.Description
	}
	if req.Avatar != "" {
		p.Avatar = req.Avatar
	}
	if err := h.projects.Update(c.Request.Context(), p); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, p)
}

// HandleDelete godoc
// @Summary 删除项目
// @ID deleteProject
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId} [delete]
func (h *ProjectHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	if err := h.projects.Delete(c.Request.Context(), tenant.ID, pid); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleGetAuth godoc
// @Summary 获取项目访问控制配置
// @ID getProjectAuth
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/auth [get]
func (h *ProjectHandler) HandleGetAuth(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	authType, keys, err := h.projects.GetAuth(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, map[string]interface{}{
		"auth_type": authType,
		"keys":      keys,
	})
}

// HandleUpdateAuth godoc
// @Summary 切换项目访问控制方式
// @ID updateProjectAuth
// @Tags project
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{auth_type=string} true "鉴权类型"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/auth [put]
func (h *ProjectHandler) HandleUpdateAuth(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req struct {
		AuthType domain.AuthType `json:"auth_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.projects.UpdateAuthType(c.Request.Context(), tenant.ID, pid, req.AuthType); err != nil {
		FailErr(c, err)
		return
	}
	authType, keys, err := h.projects.GetAuth(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, map[string]interface{}{
		"auth_type": authType,
		"keys":      keys,
	})
}

// HandleCreateAuthKey godoc
// @Summary 创建鉴权密钥（API Key 或 JWT 签名密钥）
// @ID createProjectAuthKey
// @Tags project
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{type=string,name=string,expires_at=string} true "Key 类型、名称及可选过期时间"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/auth/keys [post]
func (h *ProjectHandler) HandleCreateAuthKey(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req struct {
		Type      domain.AuthType `json:"type" binding:"required"`
		Name      string          `json:"name" binding:"required"`
		ExpiresAt *string         `json:"expires_at"` // RFC3339 or null
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			Fail(c, http.StatusBadRequest, "invalid expires_at format, expected RFC3339")
			return
		}
		expiresAt = &t
	}
	key, err := h.projects.CreateAuthKey(c.Request.Context(), tenant.ID, pid, req.Type, req.Name, expiresAt)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, key)
}

// HandleDeleteAuthKey godoc
// @Summary 删除鉴权密钥
// @ID deleteProjectAuthKey
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param keyId path string true "Key ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/auth/keys/{keyId} [delete]
func (h *ProjectHandler) HandleDeleteAuthKey(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	keyID := c.Param("keyId")
	if keyID == "" {
		Fail(c, http.StatusBadRequest, "keyId required")
		return
	}
	if err := h.projects.DeleteAuthKey(c.Request.Context(), tenant.ID, pid, keyID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
