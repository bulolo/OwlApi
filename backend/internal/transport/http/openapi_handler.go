package http

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

type OpenAPIHandler struct {
	tenants      service.TenantService
	projectRepo  domain.ProjectRepository
	endpointRepo domain.APIEndpointRepository
	groupRepo    domain.APIGroupRepository
}

// HandleExportOpenAPI generates an OpenAPI 3.0 JSON spec for a project.
// GET /api/v1/tenants/:slug/projects/:projectId/openapi.json
func (h *OpenAPIHandler) HandleExportOpenAPI(c *gin.Context) {
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
	project, err := h.projectRepo.GetProjectByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusNotFound, "project not found")
		return
	}
	endpoints, err := h.endpointRepo.ListAPIEndpoints(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	groups, err := h.groupRepo.ListAPIGroups(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	spec := buildOpenAPISpec(project, endpoints, groups)

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-openapi.json"`, project.Name))
	OK(c, spec)
}

// buildOpenAPISpec constructs an OpenAPI 3.0 specification from project data.
func buildOpenAPISpec(project *domain.Project, endpoints []*domain.APIEndpoint, groups []*domain.APIGroup) map[string]interface{} {
	groupMap := make(map[int64]string)
	for _, g := range groups {
		groupMap[g.ID] = g.Name
	}
	paths := make(map[string]interface{})

	for _, ep := range endpoints {
		fullPath := "/api/v1/query" + ep.Path
		pathItem, exists := paths[fullPath]
		if !exists {
			pathItem = make(map[string]interface{})
		}
		pathMap := pathItem.(map[string]interface{})

		operation := buildOperation(ep, groupMap[ep.GroupID])
		for _, method := range ep.Methods {
			pathMap[strings.ToLower(method)] = operation
		}

		paths[fullPath] = pathMap
	}

	spec := map[string]interface{}{
		"openapi": "3.0.3",
		"info": map[string]interface{}{
			"title":       project.Name,
			"description": project.Description,
			"version":     "1.0.0",
		},
		"paths": paths,
	}

	return spec
}

// buildOperation creates an OpenAPI operation object from an endpoint.
func buildOperation(ep *domain.APIEndpoint, groupName string) map[string]interface{} {
	tags := []string{groupName}
	if groupName == "" {
		tags = inferTags(ep.Path)
	}

	op := map[string]interface{}{
		"summary":     ep.Summary,
		"description": ep.Description,
		"operationId": buildOperationID(ep.Path, ep.Methods),
		"tags":        tags,
		"parameters": []map[string]interface{}{
			{
				"name":        "X-Tenant-ID",
				"in":          "header",
				"required":    true,
				"description": "租户 ID",
				"schema":      map[string]interface{}{"type": "string"},
			},
			{
				"name":        "X-Gateway-ID",
				"in":          "header",
				"required":    true,
				"description": "网关 ID",
				"schema":      map[string]interface{}{"type": "string"},
			},
		},
	}

	// Build request body schema from param_defs
	if len(ep.ParamDefs) > 0 {
		properties := make(map[string]interface{})
		var required []string

		for _, def := range ep.ParamDefs {
			prop := map[string]interface{}{
				"type":        mapParamType(def.Type),
				"description": def.Desc,
			}
			if def.Default != "" {
				prop["default"] = formatDefault(def.Default, def.Type)
			}
			properties[def.Name] = prop

			if def.Required {
				required = append(required, def.Name)
			}
		}

		schema := map[string]interface{}{
			"type":       "object",
			"properties": properties,
		}
		if len(required) > 0 {
			schema["required"] = required
		}

		op["requestBody"] = map[string]interface{}{
			"required": len(required) > 0,
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": schema,
				},
			},
		}
	}

	// Standard responses
	op["responses"] = map[string]interface{}{
		"200": map[string]interface{}{
			"description": "请求成功",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"code": map[string]interface{}{"type": "integer", "example": 0},
							"data": map[string]interface{}{"type": "object"},
							"msg":  map[string]interface{}{"type": "string", "example": "请求成功"},
						},
					},
				},
			},
		},
	}

	return op
}

// inferTags guesses a grouping tag from the path.
// e.g. "/api/products/search" → ["products"]
// e.g. "/users/list" → ["users"]
func inferTags(path string) []string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for _, p := range parts {
		if p == "" || p == "api" || p == "v1" || p == "v2" {
			continue
		}
		return []string{p}
	}
	return []string{"Default"}
}

// buildOperationID generates a unique and SDK-friendly operation ID from path and method.
// e.g. "/api/products/search" + "POST" → "productsSearch"
func buildOperationID(path string, methods []string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	var meaningful []string
	for _, p := range parts {
		if p == "" || p == "api" || p == "v1" || p == "v2" {
			continue
		}
		meaningful = append(meaningful, p)
	}

	if len(meaningful) == 0 {
		return "root"
	}

	var sb strings.Builder
	for i, p := range meaningful {
		if i == 0 {
			sb.WriteString(strings.ToLower(p))
		} else {
			sb.WriteString(strings.ToUpper(p[:1]) + strings.ToLower(p[1:]))
		}
	}
	return sb.String()
}

// mapParamType converts internal type names to OpenAPI types.
func mapParamType(t string) string {
	switch t {
	case "integer":
		return "integer"
	case "number":
		return "number"
	case "boolean":
		return "boolean"
	default:
		return "string"
	}
}

// formatDefault converts string default values to the appropriate type.
func formatDefault(val, typ string) interface{} {
	switch typ {
	case "integer":
		if v, err := strconv.ParseInt(val, 10, 64); err == nil {
			return v
		}
	case "number":
		if v, err := strconv.ParseFloat(val, 64); err == nil {
			return v
		}
	case "boolean":
		return val == "true" || val == "1"
	}
	return val
}
