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
	projects     service.ProjectService
}

func NewQueryHandler(queryService service.QueryService, endpoints service.APIEndpointService, releases service.EndpointReleaseService, tenants service.TenantService, projects service.ProjectService) *QueryHandler {
	return &QueryHandler{queryService: queryService, endpoints: endpoints, releases: releases, tenants: tenants, projects: projects}
}

func (h *QueryHandler) RegisterRoutes(r *gin.Engine) {
	// Published API gateway: /gw/{tenant-slug}/{project-slug}/{user-defined-path}
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
// @Router /gw/{tenantSlug}/{projectSlug}/{path} [get]
// @Router /gw/{tenantSlug}/{projectSlug}/{path} [post]
// @Router /gw/{tenantSlug}/{projectSlug}/{path} [put]
// @Router /gw/{tenantSlug}/{projectSlug}/{path} [delete]
func (h *QueryHandler) HandleQuery(c *gin.Context) {
	tenant, err := h.tenants.GetBySlug(c.Request.Context(), c.Param("tenantSlug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "tenant not found")
		return
	}

	project, err := h.projects.GetBySlug(c.Request.Context(), tenant.ID, c.Param("projectSlug"))
	if err != nil {
		Fail(c, http.StatusNotFound, "project not found")
		return
	}

	path := c.Param("path")
	method := c.Request.Method

	ep, pathParams, err := h.endpoints.MatchByPath(c.Request.Context(), tenant.ID, project.ID, path, method)
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

	// Path params are always authoritative — inject last so they override query/body values.
	for k, v := range pathParams {
		params[k] = v
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
