package http

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

type OpenAPIHandler struct {
	projects  service.ProjectService
	endpoints service.APIEndpointService
	groups    service.APIGroupService
}

// HandleExportOpenAPI godoc
// @Summary 导出项目 OpenAPI 规范
// @ID exportOpenApi
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/projects/{projectId}/openapi.json [get]
func (h *OpenAPIHandler) HandleExportOpenAPI(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	project, err := h.projects.GetByID(c.Request.Context(), tenant.ID, pid)
	if err != nil {
		FailErr(c, err)
		return
	}
	endpoints, _, err := h.endpoints.List(c.Request.Context(), tenant.ID, pid, domain.ListParams{Page: 1})
	if err != nil {
		FailErr(c, err)
		return
	}
	groups, _, err := h.groups.List(c.Request.Context(), tenant.ID, pid, domain.ListParams{Page: 1})
	if err != nil {
		FailErr(c, err)
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
		fullPath := "/api/v1/tenants/{slug}/query" + ep.Path
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

	return map[string]interface{}{
		"openapi": "3.0.3",
		"info": map[string]interface{}{
			"title":       project.Name,
			"description": project.Description,
			"version":     "1.0.0",
		},
		"paths": paths,
	}
}

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
				"name": "X-Tenant-ID", "in": "header", "required": true,
				"description": "租户 ID", "schema": map[string]interface{}{"type": "string"},
			},
			{
				"name": "X-Gateway-ID", "in": "header", "required": true,
				"description": "网关 ID", "schema": map[string]interface{}{"type": "string"},
			},
		},
	}

	if len(ep.ParamDefs) > 0 {
		properties := make(map[string]interface{})
		var required []string
		for _, def := range ep.ParamDefs {
			prop := map[string]interface{}{"type": mapParamType(def.Type), "description": def.Desc}
			if def.Default != "" {
				prop["default"] = formatDefault(def.Default, def.Type)
			}
			properties[def.Name] = prop
			if def.Required {
				required = append(required, def.Name)
			}
		}
		schema := map[string]interface{}{"type": "object", "properties": properties}
		if len(required) > 0 {
			schema["required"] = required
		}
		op["requestBody"] = map[string]interface{}{
			"required": len(required) > 0,
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{"schema": schema},
			},
		}
	}

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

func inferTags(path string) []string {
	for _, p := range strings.Split(strings.Trim(path, "/"), "/") {
		if p != "" && p != "api" && p != "v1" && p != "v2" {
			return []string{p}
		}
	}
	return []string{"Default"}
}

func buildOperationID(path string, methods []string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	var meaningful []string
	for _, p := range parts {
		if p != "" && p != "api" && p != "v1" && p != "v2" {
			meaningful = append(meaningful, p)
		}
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
