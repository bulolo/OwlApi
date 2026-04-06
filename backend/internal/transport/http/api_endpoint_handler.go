package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type APIEndpointHandler struct {
	tenants service.TenantService
	repo    domain.APIEndpointRepository
}

func (h *APIEndpointHandler) HandleList(c *gin.Context) {
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
	list, err := h.repo.ListAPIEndpoints(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, gin.H{"list": list, "total": len(list)})
}

func (h *APIEndpointHandler) HandleCreate(c *gin.Context) {
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
		Path         string            `json:"path" binding:"required"`
		Methods      []string          `json:"methods" binding:"required"`
		SQL          string            `json:"sql" binding:"required"`
		Summary      string            `json:"summary"`
		Description  string            `json:"description"`
		Params       []string          `json:"params"`
		ParamDefs    []domain.ParamDef `json:"param_defs"`
		DataSourceID int64             `json:"datasource_id"`
		GroupID      int64             `json:"group_id"`
		PreScriptID  int64             `json:"pre_script_id"`
		PostScriptID int64             `json:"post_script_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Params == nil {
		req.Params = []string{}
	}
	ep := &domain.APIEndpoint{
		TenantID:     tenant.ID,
		ProjectID:    pid,
		DataSourceID: req.DataSourceID,
		GroupID:      req.GroupID,
		Path:         req.Path,
		Methods:      req.Methods,
		Summary:      req.Summary,
		Description:  req.Description,
		SQL:          req.SQL,
		Params:       req.Params,
		ParamDefs:    req.ParamDefs,
		PreScriptID:  req.PreScriptID,
		PostScriptID: req.PostScriptID,
	}
	ep.InferMeta()
	if err := h.repo.CreateAPIEndpoint(c.Request.Context(), ep); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, ep)
}

func (h *APIEndpointHandler) HandleUpdate(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	epID, err := strconv.ParseInt(c.Param("endpointId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid endpoint id")
		return
	}
	var req struct {
		Path         string            `json:"path"`
		Methods      []string          `json:"methods"`
		SQL          string            `json:"sql"`
		Summary      string            `json:"summary"`
		Description  string            `json:"description"`
		Params       []string          `json:"params"`
		ParamDefs    []domain.ParamDef `json:"param_defs"`
		DataSourceID *int64            `json:"datasource_id"`
		GroupID      *int64            `json:"group_id"`
		PreScriptID  *int64            `json:"pre_script_id"`
		PostScriptID *int64            `json:"post_script_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ep := &domain.APIEndpoint{ID: epID, TenantID: tenant.ID, Path: req.Path, Methods: req.Methods, Summary: req.Summary, Description: req.Description, SQL: req.SQL, Params: req.Params, ParamDefs: req.ParamDefs}
	if req.DataSourceID != nil {
		ep.DataSourceID = *req.DataSourceID
	}
	if req.GroupID != nil {
		ep.GroupID = *req.GroupID
	}
	if req.PreScriptID != nil {
		ep.PreScriptID = *req.PreScriptID
	}
	if req.PostScriptID != nil {
		ep.PostScriptID = *req.PostScriptID
	}
	ep.InferMeta()
	if err := h.repo.UpdateAPIEndpoint(c.Request.Context(), ep); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, ep)
}

func (h *APIEndpointHandler) HandleDelete(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	epID, err := strconv.ParseInt(c.Param("endpointId"), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid endpoint id")
		return
	}
	if err := h.repo.DeleteAPIEndpoint(c.Request.Context(), tenant.ID, epID); err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	OK(c, nil)
}
