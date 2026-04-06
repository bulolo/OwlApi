package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type ProjectHandler struct {
	tenants service.TenantService
	repo    domain.ProjectRepository
}

func (h *ProjectHandler) HandleList(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	list, err := h.repo.ListProjects(c.Request.Context(), tenant.ID)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

func (h *ProjectHandler) HandleCreate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
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
	p := &domain.Project{TenantID: tenant.ID, Name: req.Name, Description: req.Description}
	if err := h.repo.CreateProject(c.Request.Context(), p); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, p)
}

func (h *ProjectHandler) HandleGet(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	pid, err := strconv.ParseInt(c.Param("projectId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetProjectByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusNotFound, "project not found")
		return
	}
	OK(c, p)
}

func (h *ProjectHandler) HandleUpdate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	pid, err := strconv.ParseInt(c.Param("projectId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid project id")
		return
	}
	p, err := h.repo.GetProjectByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusNotFound, "project not found")
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
	if err := h.repo.UpdateProject(c.Request.Context(), p); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, p)
}

func (h *ProjectHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	pid, err := strconv.ParseInt(c.Param("projectId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid project id")
		return
	}
	if err := h.repo.DeleteProject(c.Request.Context(), tenant.ID, pid); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
