package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type ScriptHandler struct {
	tenants service.TenantService
	repo    domain.ScriptRepository
}

func (h *ScriptHandler) HandleList(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	list, err := h.repo.ListScripts(c.Request.Context(), tenant.ID)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

func (h *ScriptHandler) HandleCreate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"`
		Code        string `json:"code" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.Script{TenantID: tenant.ID, Name: req.Name, Type: req.Type, Code: req.Code, Description: req.Description}
	if err := h.repo.CreateScript(c.Request.Context(), s); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, s)
}

func (h *ScriptHandler) HandleUpdate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	sid, err := strconv.ParseInt(c.Param("scriptId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid script id")
		return
	}
	var req struct {
		Name        string `json:"name"`
		Type        string `json:"type"`
		Code        string `json:"code"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	s := &domain.Script{ID: sid, TenantID: tenant.ID, Name: req.Name, Type: req.Type, Code: req.Code, Description: req.Description}
	if err := h.repo.UpdateScript(c.Request.Context(), s); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, s)
}

func (h *ScriptHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	sid, err := strconv.ParseInt(c.Param("scriptId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid script id")
		return
	}
	if err := h.repo.DeleteScript(c.Request.Context(), tenant.ID, sid); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
