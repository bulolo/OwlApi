package http

import (
	"log/slog"
	"net/http"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type APIEndpointHandler struct {
	endpoints service.APIEndpointService
	active    service.EndpointVersionService
	envs      service.EnvironmentService
}

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
// @Param group_id query int false "按分组过滤（0=不过滤）"
// @Success 200 {object} RAPIEndpointList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints [get]
func (h *APIEndpointHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	if gid, err := parseInt64(c.Query("group_id")); err == nil && gid > 0 {
		lp.GroupID = gid
	}
	list, total, err := h.endpoints.List(c.Request.Context(), tenant.ID, pid, lp)
	if err != nil {
		FailErr(c, err)
		return
	}

	// Enrich each endpoint with its per-env activation status so the list UI
	// can show "prod v3 / dev v5" badges in one round-trip.
	if len(list) > 0 {
		envs, err := h.envs.List(c.Request.Context(), tenant.ID, pid)
		if err != nil {
			// 仅用于补充展示用的 env 名称，失败不应让整个接口列表 500——降级继续。
			slog.Warn("list envs for endpoint enrichment failed", "project_id", pid, "err", err)
		}
		envNames := make(map[int64]string, len(envs))
		for _, e := range envs {
			envNames[e.ID] = e.Name
		}
		for _, ep := range list {
			actives, err := h.active.ListActiveByEndpoint(c.Request.Context(), tenant.ID, ep.ID)
			if err != nil {
				continue
			}
			ep.EnvActivations = make([]domain.EndpointEnvActivity, 0, len(actives))
			for _, av := range actives {
				ep.EnvActivations = append(ep.EnvActivations, domain.EndpointEnvActivity{
					EnvID:     av.EnvID,
					EnvName:   envNames[av.EnvID],
					Version:   av.Version,
					VersionID: av.VersionID,
				})
			}
		}
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
// @Param body body object{path=string,method=string,sql=string,summary=string,description=string,datasource_alias=string,group_id=int,pre_scripts=array,post_scripts=array,param_defs=array} true "端点信息"
// @Success 200 {object} RAPIEndpoint
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints [post]
func (h *APIEndpointHandler) HandleCreate(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req struct {
		Path            string               `json:"path" binding:"required"`
		Method          string               `json:"method" binding:"required"`
		SQL             string               `json:"sql" binding:"required"`
		Summary         string               `json:"summary"`
		Description     string               `json:"description"`
		ParamDefs       []domain.ParamDef    `json:"param_defs"`
		ResponseDefs    []domain.ResponseDef `json:"response_defs"`
		DataSourceAlias string               `json:"datasource_alias"`
		GroupID         int64                `json:"group_id"`
		PreScripts      []domain.ScriptStep  `json:"pre_scripts"`
		PostScripts     []domain.ScriptStep  `json:"post_scripts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ep := &domain.APIEndpoint{
		TenantID: tenant.ID, ProjectID: pid,
		DataSourceAlias: req.DataSourceAlias, GroupID: req.GroupID,
		Path: req.Path, Method: req.Method,
		Summary: req.Summary, Description: req.Description,
		SQL: req.SQL, ParamDefs: req.ParamDefs, ResponseDefs: req.ResponseDefs,
		PreScripts: req.PreScripts, PostScripts: req.PostScripts,
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
// @Param body body object{path=string,method=string,sql=string,summary=string,description=string,datasource_alias=string,group_id=int,pre_scripts=array,post_scripts=array,param_defs=array,response_defs=array} true "完整端点信息（全量替换）"
// @Success 200 {object} RAPIEndpoint
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId} [put]
func (h *APIEndpointHandler) HandleUpdate(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	var req struct {
		Path            string               `json:"path"             binding:"required"`
		Method          string               `json:"method"           binding:"required"`
		SQL             string               `json:"sql"              binding:"required"`
		Summary         string               `json:"summary"`
		Description     string               `json:"description"`
		ParamDefs       []domain.ParamDef    `json:"param_defs"`
		ResponseDefs    []domain.ResponseDef `json:"response_defs"`
		DataSourceAlias string               `json:"datasource_alias"`
		GroupID         int64                `json:"group_id"`
		PreScripts      []domain.ScriptStep  `json:"pre_scripts"`
		PostScripts     []domain.ScriptStep  `json:"post_scripts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ep := &domain.APIEndpoint{
		ID: epID, TenantID: tenant.ID,
		Path: req.Path, Method: req.Method,
		Summary: req.Summary, Description: req.Description,
		SQL: req.SQL, ParamDefs: req.ParamDefs, ResponseDefs: req.ResponseDefs,
		DataSourceAlias: req.DataSourceAlias,
		GroupID:         req.GroupID,
		PreScripts:      req.PreScripts,
		PostScripts:     req.PostScripts,
	}
	if err := h.endpoints.Update(c.Request.Context(), ep); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, ep)
}

// HandlePatch godoc
// @Summary 局部更新 API 端点（仅 group_id 等可选字段）
// @ID patchEndpoint
// @Tags endpoint
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param body body object{group_id=int} false "需更新的字段"
// @Success 200 {object} RAPIEndpoint
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId} [patch]
func (h *APIEndpointHandler) HandlePatch(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	var req struct {
		GroupID *int64 `json:"group_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ep, err := h.endpoints.GetByID(c.Request.Context(), tenant.ID, epID)
	if err != nil {
		FailErr(c, err)
		return
	}
	if req.GroupID != nil {
		ep.GroupID = *req.GroupID
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
