package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
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
	callLogs     service.EndpointCallLogService
}

func NewQueryHandler(
	queryService service.QueryService,
	endpoints service.APIEndpointService,
	versions service.EndpointVersionService,
	tenants service.TenantService,
	projects service.ProjectService,
	callLogs service.EndpointCallLogService,
) *QueryHandler {
	return &QueryHandler{
		queryService: queryService, endpoints: endpoints, versions: versions,
		tenants: tenants, projects: projects, callLogs: callLogs,
	}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	// Published API gateway: /{tenantSlug}/{projectSlug}/{user-defined-path}
	// 直接挂在根路径，没有前缀；控制面接口走 /v1/...，二者不冲突。
	// All HTTP methods are accepted; per-endpoint method validation happens inside.
	r.Any("/:tenantSlug/:projectSlug/*path", h.HandleQuery)
}

// HandleQuery godoc
// @Summary 执行已发布的 API 接口
// @ID executeQuery
// @Tags gateway
// @Accept json
// @Produce json
// @Param tenantSlug path string true "租户 slug"
// @Param projectSlug path string true "项目 slug"
// @Param path path string true "接口路径（用户在项目中定义的路径）"
// @Param body body object{} false "请求参数 (POST/PUT 从 body 读，GET/DELETE 从 query string 读)"
// @Success 200 {object} object
// @Router /{tenantSlug}/{projectSlug}/{path} [get]
// @Router /{tenantSlug}/{projectSlug}/{path} [post]
// @Router /{tenantSlug}/{projectSlug}/{path} [put]
// @Router /{tenantSlug}/{projectSlug}/{path} [delete]
func (h *QueryHandler) HandleQuery(c *gin.Context) {
	start := time.Now()
	method := c.Request.Method
	path := c.Param("path")

	// 整个处理流程结束后异步写一条调用日志（无论成功失败），但仅在能识别到接口归属时才写。
	// 这些变量在请求处理过程中逐步被填充，闭包捕获后 defer 里读取。
	var (
		tenantID   int64
		endpointID int64
		versionID  int64
		versionNum int
		params     map[string]string
		respErr    string
	)

	defer func() {
		// 在 endpoint 还没解析出来之前（tenant/project/endpoint 404）写日志没有归属，跳过。
		if endpointID == 0 || tenantID == 0 {
			return
		}
		// gin 的 c.Writer.Status() 在响应方法 (c.JSON / c.Data / Fail / OK) 调用后会反映真实状态码
		status := c.Writer.Status()
		// 收尾时把 params (map[string]string) 转为 map[string]any 以匹配 JSONB 列
		var p domain.CallLogParams
		if len(params) > 0 {
			p = make(domain.CallLogParams, len(params))
			for k, v := range params {
				p[k] = v
			}
		}
		h.callLogs.Append(c.Request.Context(), &domain.EndpointCallLog{
			TenantID:   tenantID,
			EndpointID: endpointID,
			VersionID:  versionID,
			Version:    versionNum,
			Method:     method,
			Path:       path,
			Params:     p,
			Status:     status,
			LatencyMs:  int(time.Since(start).Milliseconds()),
			Error:      respErr,
			IP:         c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
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

	ep, pathParams, err := h.endpoints.MatchByPath(c.Request.Context(), tenant.ID, project.ID, path, method)
	if err != nil {
		// 接口路径找不到 → 不归属任何 endpoint，按设计不入流水。
		Fail(c, http.StatusNotFound, "API endpoint not found")
		return
	}
	endpointID = ep.ID

	v, err := h.versions.GetActiveSnapshot(c.Request.Context(), tenant.ID, ep.ID)
	if err != nil || v == nil || v.Snapshot == nil {
		respErr = "endpoint not published"
		Fail(c, http.StatusNotFound, "API endpoint not available")
		return
	}
	versionID = v.ID
	versionNum = v.Version
	endpoint := v.Snapshot

	if !methodAllowed(method, endpoint.Methods) {
		c.Header("Allow", joinMethods(endpoint.Methods))
		respErr = "method not allowed"
		Fail(c, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	// Extract raw params based on convention:
	//   GET / DELETE → query string
	//   POST / PUT   → JSON request body
	raw := make(map[string]interface{})
	switch method {
	case http.MethodGet, http.MethodDelete:
		for k, vs := range c.Request.URL.Query() {
			if len(vs) > 0 {
				raw[k] = vs[0]
			}
		}
	default: // POST, PUT
		if err := c.ShouldBindJSON(&raw); err != nil && err.Error() != "EOF" {
			respErr = "invalid request body: " + err.Error()
			Fail(c, http.StatusBadRequest, "invalid request body: "+err.Error())
			return
		}
	}

	// Resolve params through ParamDefs: apply defaults, enforce required.
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

	// Path params are always authoritative — inject last so they override query/body values.
	for k, v := range pathParams {
		params[k] = v
	}

	result, err := h.queryService.Execute(c.Request.Context(), strconv.FormatInt(tenant.ID, 10), endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "slug", c.Param("slug"), "path", path, "error", err)
		respErr = err.Error()
		FailErr(c, err)
		return
	}

	if !result.Success {
		respErr = result.Error
		Fail(c, http.StatusInternalServerError, result.Error)
		return
	}

	c.Data(http.StatusOK, "application/json", result.Data)
}

func methodAllowed(method string, allowed []string) bool {
	for _, m := range allowed {
		if m == method {
			return true
		}
	}
	return false
}

func joinMethods(methods []string) string {
	result := ""
	for i, m := range methods {
		if i > 0 {
			result += ", "
		}
		result += m
	}
	return result
}
