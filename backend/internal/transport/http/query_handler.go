package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type QueryHandler struct {
	queryService service.QueryService
	endpoints    service.APIEndpointService
	releases     service.EndpointReleaseService
	tenants      service.TenantService
}

func NewQueryHandler(queryService service.QueryService, endpoints service.APIEndpointService, releases service.EndpointReleaseService, tenants service.TenantService) *QueryHandler {
	return &QueryHandler{queryService: queryService, endpoints: endpoints, releases: releases, tenants: tenants}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	// Accept all methods; actual method validation happens inside the handler
	// against the endpoint's configured Methods list.
	r.Any("/api/v1/tenants/:slug/query/*path", h.HandleQuery)
}

// HandleQuery godoc
// @Summary 执行动态 API 查询
// @ID executeQuery
// @Tags query
// @Accept json
// @Produce json
// @Param slug path string true "租户 slug"
// @Param path path string true "API 路径"
// @Param body body object{} false "查询参数 (POST/PUT 从 body 读，GET/DELETE 从 query string 读)"
// @Success 200 {object} object
// @Router /api/v1/tenants/{slug}/query/{path} [get]
// @Router /api/v1/tenants/{slug}/query/{path} [post]
// @Router /api/v1/tenants/{slug}/query/{path} [put]
// @Router /api/v1/tenants/{slug}/query/{path} [delete]
func (h *QueryHandler) HandleQuery(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}

	path := c.Param("path")
	ep, err := h.endpoints.GetByPath(c.Request.Context(), tenant.ID, path)
	if err != nil {
		Fail(c, http.StatusNotFound, "API endpoint not found")
		return
	}
	if ep.Status != "published" {
		Fail(c, http.StatusNotFound, "API endpoint not available")
		return
	}
	rel, err := h.releases.GetRelease(c.Request.Context(), tenant.ID, ep.PublishedReleaseID)
	if err != nil || rel.Snapshot == nil {
		Fail(c, http.StatusInternalServerError, "failed to load published version")
		return
	}
	endpoint := rel.Snapshot

	// Validate HTTP method against the endpoint's allowed methods.
	method := c.Request.Method
	if !methodAllowed(method, endpoint.Methods) {
		c.Header("Allow", joinMethods(endpoint.Methods))
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
			Fail(c, http.StatusBadRequest, "invalid request body: "+err.Error())
			return
		}
	}

	// Resolve params through ParamDefs: apply defaults, enforce required.
	params := make(map[string]string)
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
			Fail(c, http.StatusBadRequest, fmt.Sprintf("missing required parameter: %s", def.Name))
			return
		}
	}

	tenantID := strconv.FormatInt(tenant.ID, 10)
	result, err := h.queryService.Execute(c.Request.Context(), tenantID, endpoint, params)
	if err != nil {
		slog.Error("Query execution failed", "slug", c.Param("slug"), "path", path, "error", err)
		FailErr(c, err)
		return
	}

	if !result.Success {
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
