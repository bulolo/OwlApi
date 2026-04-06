package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type APIGroupHandler struct {
	tenants service.TenantService
	repo    domain.APIGroupRepository
}

func (h *APIGroupHandler) HandleList(c *gin.Context) {
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
	list, err := h.repo.ListAPIGroups(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

func (h *APIGroupHandler) HandleCreate(c *gin.Context) {
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
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	group := &domain.APIGroup{
		TenantID:    tenant.ID,
		ProjectID:   pid,
		Name:        req.Name,
		Description: req.Description,
	}
	if err := h.repo.CreateAPIGroup(c.Request.Context(), group); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, group)
}

func (h *APIGroupHandler) HandleUpdate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	gid, err := strconv.ParseInt(c.Param("groupId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid group id")
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
	group := &domain.APIGroup{
		ID:          gid,
		TenantID:    tenant.ID,
		Name:        req.Name,
		Description: req.Description,
	}
	if err := h.repo.UpdateAPIGroup(c.Request.Context(), group); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, group)
}

func (h *APIGroupHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	gid, err := strconv.ParseInt(c.Param("groupId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid group id")
		return
	}
	if err := h.repo.DeleteAPIGroup(c.Request.Context(), tenant.ID, gid); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
