package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type QueryHandler struct {
	queryService service.QueryService
	endpoints    service.APIEndpointService
	versions     service.EndpointVersionService
	tenants      service.TenantService
	projects     service.ProjectService
	envs         service.EnvironmentService
	callLogs     service.EndpointCallLogService
}

func NewQueryHandler(
	queryService service.QueryService,
	endpoints service.APIEndpointService,
	versions service.EndpointVersionService,
	tenants service.TenantService,
	projects service.ProjectService,
	envs service.EnvironmentService,
	callLogs service.EndpointCallLogService,
) *QueryHandler {
	return &QueryHandler{
		queryService: queryService, endpoints: endpoints, versions: versions,
		tenants: tenants, projects: projects, envs: envs, callLogs: callLogs,
	}
}

// RegisterRoutes wires the public gateway URL:
//
//	/-/:env/:tenantSlug/:projectSlug/*path
//
// The `/-/` reserved prefix keeps the gateway namespace disjoint from the
// control-plane API (`/v1/...`) and any future root routes (`/metrics`,
// `/health`, `/_next/...`). env is mandatory, always second after the prefix.
// All HTTP methods accepted; per-endpoint method validation happens inside.
func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	r.Any("/-/:env/:tenantSlug/:projectSlug/*path", h.HandleQuery)
}

// HandleQuery godoc
// @Summary 执行已发布的 API 接口
// @ID executeQuery
// @Tags gateway
// @Accept json
// @Produce json
// @Param env path string true "环境名（项目级，例如 prod / dev / staging）"
// @Param tenantSlug path string true "租户 slug"
// @Param projectSlug path string true "项目 slug"
// @Param path path string true "接口路径（用户在项目中定义的路径）"
// @Param body body object{} false "请求参数 (POST/PUT 从 body 读，GET/DELETE 从 query string 读)"
// @Success 200 {object} object
// @Router /-/{env}/{tenantSlug}/{projectSlug}/{path} [get]
// @Router /-/{env}/{tenantSlug}/{projectSlug}/{path} [post]
// @Router /-/{env}/{tenantSlug}/{projectSlug}/{path} [put]
// @Router /-/{env}/{tenantSlug}/{projectSlug}/{path} [delete]
func (h *QueryHandler) HandleQuery(c *gin.Context) {
	start := time.Now()
	method := c.Request.Method
	path := c.Param("path")

	var (
		tenantID    int64
		envID       int64
		endpointID  int64
		versionID   int64
		versionNum  int
		params      map[string]string
		pathParams  map[string]string
		queryParams map[string]string
		bodyParams  map[string]string
		headers     map[string]string
		respErr     string
	)

	defer func() {
		if endpointID == 0 || tenantID == 0 {
			return
		}
		status := c.Writer.Status()
		var p domain.CallLogParams
		if len(params) > 0 {
			p = make(domain.CallLogParams, len(params))
			for k, v := range params {
				p[k] = v
			}
		}
		h.callLogs.Append(c.Request.Context(), &domain.EndpointCallLog{
			TenantID:    tenantID,
			EndpointID:  endpointID,
			EnvID:       envID,
			VersionID:   versionID,
			Version:     versionNum,
			Method:      method,
			Path:        path,
			Params:      p,
			PathParams:  pathParams,
			QueryParams: queryParams,
			BodyParams:  bodyParams,
			Headers:     headers,
			Status:      status,
			LatencyMs:   int(time.Since(start).Milliseconds()),
			Error:       respErr,
			IP:          c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
		})
	}()

	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("tenantSlug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}
	tenantID = tenant.ID

	project, err := h.projects.GetBySlug(c.Request.Context(), tenant.ID, c.Param("projectSlug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "project not found")
		return
	}

	if err := h.projects.ValidateAuth(c.Request.Context(), project, c.GetHeader("Authorization")); err != nil {
		Fail(c, http.StatusUnauthorized, err.Error())
		return
	}

	headers = captureHeaders(c.Request.Header)

	env, err := h.envs.GetByName(c.Request.Context(), tenant.ID, project.ID, c.Param("env"))
	if err != nil {
		Fail(c, http.StatusNotFound, "env not found")
		return
	}
	envID = env.ID

	ep, pathParams, err := h.endpoints.MatchByPath(c.Request.Context(), tenant.ID, project.ID, env.ID, path, method)
	if err != nil {
		Fail(c, http.StatusNotFound, "API endpoint not found")
		return
	}
	endpointID = ep.ID

	v, err := h.versions.GetActiveSnapshot(c.Request.Context(), tenant.ID, ep.ID, env.ID)
	if err != nil || v == nil || v.Snapshot == nil {
		respErr = "endpoint not published in env " + env.Name
		Fail(c, http.StatusNotFound, "API endpoint not available in env "+env.Name)
		return
	}
	versionID = v.ID
	versionNum = v.Version
	endpoint := v.Snapshot

	if !strings.EqualFold(endpoint.Method, method) {
		c.Header("Allow", endpoint.Method)
		respErr = "method not allowed"
		Fail(c, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	raw := make(map[string]interface{})
	switch method {
	case http.MethodGet, http.MethodDelete:
		qp := make(map[string]string)
		for k, vs := range c.Request.URL.Query() {
			if len(vs) > 0 {
				raw[k] = vs[0]
				qp[k] = vs[0]
			}
		}
		if len(qp) > 0 {
			queryParams = qp
		}
	default:
		if err := c.ShouldBindJSON(&raw); err != nil && err.Error() != "EOF" {
			respErr = "invalid request body: " + err.Error()
			Fail(c, http.StatusBadRequest, "invalid request body: "+err.Error())
			return
		}
		if len(raw) > 0 {
			bp := make(map[string]string, len(raw))
			for k, v := range raw {
				bp[k] = fmt.Sprintf("%v", v)
			}
			bodyParams = bp
		}
	}

	params = make(map[string]string)
	for _, def := range endpoint.ParamDefs {
		if v, ok := raw[def.Name]; ok {
			params[def.Name] = fmt.Sprintf("%v", v)
			continue
		}
		if def.Default != "" {
			params[def.Name] = def.Default
			continue
		}
		if def.Required {
			respErr = "missing required parameter: " + def.Name
			Fail(c, http.StatusBadRequest, respErr)
			return
		}
	}

	for k, v := range pathParams {
		params[k] = v
	}

	result, err := h.queryService.Execute(c.Request.Context(), strconv.FormatInt(tenant.ID, 10), env.ID, endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "tenant", tenant.Slug, "env", env.Name, "path", path, "error", err)
		respErr = err.Error()
		FailErr(c, err)
		return
	}

	if !result.Success {
		respErr = result.Error
		Fail(c, resultStatus(result.ErrorCode), result.Error)
		return
	}

	c.Data(http.StatusOK, "application/json", result.Data)
}

// skipHeaders lists headers that must not be logged (sensitive or irrelevant to replay).
var skipHeaders = map[string]struct{}{
	"authorization":     {},
	"cookie":            {},
	"content-length":    {},
	"host":              {},
	"connection":        {},
	"transfer-encoding": {},
	"accept-encoding":   {},
}

func captureHeaders(h http.Header) map[string]string {
	out := make(map[string]string, len(h))
	for k, vs := range h {
		if _, skip := skipHeaders[strings.ToLower(k)]; skip {
			continue
		}
		if len(vs) > 0 {
			out[k] = vs[0]
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
