package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type APIEndpointHandler struct{ endpoints service.APIEndpointService }

// HandleList godoc
// @Summary 获取 API 端点列表
// @ID listEndpoints
// @Tags endpoint
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param page query int false "页码（默认1）"
// @Param size query int false "每页数量（默认10）"
// @Param is_pager query int false "是否分页，0=返回全部（默认1）"
// @Param keyword query string false "关键词搜索"
// @Success 200 {object} RAPIEndpointList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints [get]
func (h *APIEndpointHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	list, total, err := h.endpoints.List(c.Request.Context(), tenant.ID, pid, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleCreate godoc
// @Summary 创建 API 端点
// @ID createEndpoint
// @Tags endpoint
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{path=string,methods=array,sql=string,summary=string,description=string,datasource_id=int,group_id=int,pre_script_id=int,post_script_id=int,param_defs=array} true "端点信息"
// @Success 200 {object} RAPIEndpoint
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints [post]
func (h *APIEndpointHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
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
		TenantID: tenant.ID, ProjectID: pid,
		DataSourceID: req.DataSourceID, GroupID: req.GroupID,
		Path: req.Path, Methods: req.Methods,
		Summary: req.Summary, Description: req.Description,
		SQL: req.SQL, Params: req.Params, ParamDefs: req.ParamDefs,
		PreScriptID: req.PreScriptID, PostScriptID: req.PostScriptID,
	}
	if err := h.endpoints.Create(c.Request.Context(), ep); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, ep)
}

// HandleUpdate godoc
// @Summary 更新 API 端点
// @ID updateEndpoint
// @Tags endpoint
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param body body object{path=string,methods=array,sql=string,summary=string,description=string,datasource_id=int,group_id=int,pre_script_id=int,post_script_id=int,param_defs=array} false "更新信息"
// @Success 200 {object} RAPIEndpoint
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId} [put]
func (h *APIEndpointHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
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
	ep := &domain.APIEndpoint{
		ID: epID, TenantID: tenant.ID,
		Path: req.Path, Methods: req.Methods,
		Summary: req.Summary, Description: req.Description,
		SQL: req.SQL, Params: req.Params, ParamDefs: req.ParamDefs,
	}
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
	if err := h.endpoints.Update(c.Request.Context(), ep); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, ep)
}

// HandleDelete godoc
// @Summary 删除 API 端点
// @ID deleteEndpoint
// @Tags endpoint
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId} [delete]
func (h *APIEndpointHandler) HandleDelete(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	if err := h.endpoints.Delete(c.Request.Context(), tenant.ID, epID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}
