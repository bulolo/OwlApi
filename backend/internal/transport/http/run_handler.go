package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type RunHandler struct {
	projects  service.ProjectService
	queries   service.QueryService
	endpoints service.APIEndpointService
	versions  service.EndpointVersionService
	envs      service.EnvironmentService
	callLogs  service.EndpointCallLogService
}

// HandleRun godoc
// @Summary 代理执行 API 端点（含鉴权验证和访问日志）
// @ID runEndpoint
// @Tags query
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{endpoint_id=int,env_id=int,params=object,auth_credential=string,ignore_scripts=bool} true "执行参数"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/projects/{projectId}/run [post]
func (h *RunHandler) HandleRun(c *gin.Context) {
	start := time.Now()
	tenant := GetTenant(c)

	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}

	var req struct {
		EndpointID     int64             `json:"endpoint_id" binding:"required"`
		EnvID          int64             `json:"env_id"`
		Params         map[string]string `json:"params"`
		AuthCredential string            `json:"auth_credential"`
		IgnoreScripts  bool              `json:"ignore_scripts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Params == nil {
		req.Params = make(map[string]string)
	}

	proj, err := h.projects.GetByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, domain.ErrNotFound("project not found"))
		return
	}

	// Validate auth credential unless project is public
	if err := h.projects.ValidateAuth(c.Request.Context(), proj, req.AuthCredential); err != nil {
		Fail(c, http.StatusUnauthorized, err.Error())
		return
	}

	endpoint, err := h.endpoints.GetByID(c.Request.Context(), tenant.ID, req.EndpointID)
	if err != nil {
		FailErr(c, domain.ErrNotFound("endpoint not found"))
		return
	}
	if endpoint.ProjectID != pid {
		FailErr(c, domain.ErrNotFound("endpoint not found in project"))
		return
	}
	if req.IgnoreScripts {
		endpoint.PreScripts = nil
		endpoint.PostScripts = nil
	}

	envID := req.EnvID
	if envID == 0 {
		def, err := h.envs.GetDefault(c.Request.Context(), tenant.ID, endpoint.ProjectID)
		if err != nil {
			FailErr(c, domain.ErrBadRequest("env_id required and project has no default env"))
			return
		}
		envID = def.ID
	}

	tenantIDStr := strconv.FormatInt(tenant.ID, 10)
	result, err := h.queries.Execute(c.Request.Context(), tenantIDStr, envID, endpoint, req.Params)

	// Write access log regardless of execution outcome
	status := http.StatusOK
	var respErr string
	if err != nil {
		status = http.StatusInternalServerError
		respErr = err.Error()
	} else if !result.Success {
		status = resultStatus(result.ErrorCode)
		respErr = result.Error
	}

	logMethod := endpoint.Method
	if logMethod == "" {
		logMethod = "GET"
	}
	isGetLike := logMethod == "GET" || logMethod == "DELETE"

	// Split path params vs body/query params.
	pathParamSet := extractRunPathParams(endpoint.Path)
	pathParams := map[string]string{}
	nonPathParams := map[string]string{}
	for k, v := range req.Params {
		if _, ok := pathParamSet[k]; ok {
			pathParams[k] = v
		} else {
			nonPathParams[k] = v
		}
	}
	var queryParams, bodyParams map[string]string
	if isGetLike {
		if len(nonPathParams) > 0 {
			queryParams = nonPathParams
		}
	} else {
		if len(nonPathParams) > 0 {
			bodyParams = nonPathParams
		}
	}
	if len(pathParams) == 0 {
		pathParams = nil
	}

	h.callLogs.Append(c.Request.Context(), &domain.EndpointCallLog{
		TenantID:    tenant.ID,
		EndpointID:  endpoint.ID,
		EnvID:       envID,
		Method:      logMethod,
		Path:        resolveEndpointPath(endpoint.Path, pathParams),
		PathParams:  pathParams,
		QueryParams: queryParams,
		BodyParams:  bodyParams,
		Headers:     captureHeaders(c.Request.Header),
		Status:      status,
		LatencyMs:   int(time.Since(start).Milliseconds()),
		Error:       respErr,
		IP:          c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
	})

	if err != nil {
		FailErr(c, err)
		return
	}
	if !result.Success {
		Fail(c, resultStatus(result.ErrorCode), result.Error)
		return
	}
	c.Data(http.StatusOK, "application/json", result.Data)
}

// resultStatus maps a QueryResult.ErrorCode to an HTTP status. A zero code
// (the default for SQL / runtime failures) falls back to 500; a script-supplied
// code such as 400 from a pre-script validation rejection is used as-is.
func resultStatus(code int32) int {
	if code != 0 {
		return int(code)
	}
	return http.StatusInternalServerError
}

// HandleRunSQL godoc
// @Summary 直接执行 SQL（不保存，仅用于设计器调试）
// @ID runSQL
// @Tags query
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param body body object{sql=string,datasource_alias=string,env_id=int,params=object} true "执行参数"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/projects/{projectId}/run-sql [post]
func (h *RunHandler) HandleRunSQL(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	var req struct {
		SQL             string            `json:"sql" binding:"required"`
		DatasourceAlias string            `json:"datasource_alias" binding:"required"`
		EnvID           int64             `json:"env_id"`
		Params          map[string]string `json:"params"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Params == nil {
		req.Params = make(map[string]string)
	}

	envID := req.EnvID
	if envID == 0 {
		def, err := h.envs.GetDefault(c.Request.Context(), tenant.ID, pid)
		if err != nil {
			FailErr(c, domain.ErrBadRequest("env_id required and project has no default env"))
			return
		}
		envID = def.ID
	}

	// Build a transient endpoint — never persisted, only used for this execution.
	ep := &domain.APIEndpoint{
		TenantID:        tenant.ID,
		ProjectID:       pid,
		DataSourceAlias: req.DatasourceAlias,
		SQL:             req.SQL,
	}

	tenantIDStr := strconv.FormatInt(tenant.ID, 10)
	result, err := h.queries.Execute(c.Request.Context(), tenantIDStr, envID, ep, req.Params)
	if err != nil {
		FailErr(c, err)
		return
	}
	if !result.Success {
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}
	c.Data(http.StatusOK, "application/json", result.Data)
}

func extractRunPathParams(path string) map[string]struct{} {
	names := make(map[string]struct{})
	for _, seg := range strings.Split(path, "/") {
		if strings.HasPrefix(seg, ":") {
			names[seg[1:]] = struct{}{}
		}
	}
	return names
}

func resolveEndpointPath(tmpl string, params map[string]string) string {
	result := tmpl
	for k, v := range params {
		result = strings.ReplaceAll(result, ":"+k, v)
	}
	return result
}
