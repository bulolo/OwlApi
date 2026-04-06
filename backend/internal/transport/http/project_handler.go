package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type ProjectHandler struct{ projects service.ProjectService }

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
// @Param body body object{name=string,description=string} true "项目信息"
// @Success 200 {object} RProject
// @Router /v1/tenants/{slug}/projects [post]
func (h *ProjectHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	p := &domain.Project{TenantID: tenant.ID, Name: req.Name, Description: req.Description}
	if err := h.projects.Create(c.Request.Context(), p); err != nil {
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
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Name != "" {
		p.Name = req.Name
	}
	if req.Description != "" {
		p.Description = req.Description
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
