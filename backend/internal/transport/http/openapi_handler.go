package http

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/dop251/goja"
	"github.com/gin-gonic/gin"
)

var rePathParam = regexp.MustCompile(`:(\w+)`)

type OpenAPIHandler struct {
	projects  service.ProjectService
	endpoints service.APIEndpointService
	groups    service.APIGroupService
	envs      service.EnvironmentService
	scripts   service.ScriptService
}

// NewOpenAPIHandler 给 EE 模块用——避免 EE 内部重复装配 spec 构建逻辑。
func NewOpenAPIHandler(
	projects service.ProjectService,
	endpoints service.APIEndpointService,
	groups service.APIGroupService,
	envs service.EnvironmentService,
	scripts service.ScriptService,
) *OpenAPIHandler {
	return &OpenAPIHandler{
		projects:  projects,
		endpoints: endpoints,
		groups:    groups,
		envs:      envs,
		scripts:   scripts,
	}
}

// HandleExportOpenAPI godoc
// @Summary 导出项目 OpenAPI 规范
// @ID exportOpenApi
// @Tags project
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param env query string false "环境名（默认: 项目默认 env）"
// @Success 200 {object} object
// @Router /v1/tenants/{slug}/projects/{projectId}/openapi.json [get]
func (h *OpenAPIHandler) HandleExportOpenAPI(c *gin.Context) {
	tenant := GetTenant(c)
	pid, ok := pathInt64(c, "projectId")
	if !ok {
		return
	}
	project, env, spec, err := h.BuildSpec(c.Request.Context(), tenant.ID, pid, c.Query("env"))
	if err != nil {
		FailErr(c, err)
		return
	}
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s-openapi.json"`, project.Name, env.Name))
	OK(c, spec)
}

// BuildSpec is the reusable entry point for assembling an OpenAPI 3.0 spec
// for a specific project/env. Returns (project, env, spec, err) so callers
// can use project/env metadata for naming etc.
//
// envName == "" → use project default env.
func (h *OpenAPIHandler) BuildSpec(ctx context.Context, tenantID, projectID int64, envName string) (*domain.Project, *domain.ProjectEnvironment, map[string]interface{}, error) {
	project, err := h.projects.GetByID(ctx, tenantID, projectID)
	if err != nil {
		return nil, nil, nil, err
	}
	var env *domain.ProjectEnvironment
	if envName != "" {
		env, err = h.envs.GetByName(ctx, tenantID, projectID, envName)
	} else {
		env, err = h.envs.GetDefault(ctx, tenantID, projectID)
	}
	if err != nil || env == nil {
		return nil, nil, nil, domain.ErrNotFound("env not found")
	}

	// 只导出该环境已发版的接口，反映真实上线状态
	endpoints, err := h.endpoints.ListPublishedInEnv(ctx, tenantID, projectID, env.ID)
	if err != nil {
		return nil, nil, nil, err
	}
	groups, _, err := h.groups.List(ctx, tenantID, projectID, domain.ListParams{Page: 1})
	if err != nil {
		return nil, nil, nil, err
	}

	// 响应 schema 取自后置链最后一段（产生最终响应结构的那一步），按 endpoint 维度缓存。
	postCodeByEndpoint := make(map[int64]string)
	for _, ep := range endpoints {
		if len(ep.PostScripts) == 0 {
			continue
		}
		last := ep.PostScripts[len(ep.PostScripts)-1]
		switch last.Source {
		case domain.ScriptStepInline:
			postCodeByEndpoint[ep.ID] = last.Code
		case domain.ScriptStepLibrary:
			if last.ScriptID != 0 {
				if sc, err := h.scripts.GetByID(ctx, tenantID, last.ScriptID); err == nil && sc != nil {
					postCodeByEndpoint[ep.ID] = sc.Code
				}
			}
		}
	}
	return project, env, buildOpenAPISpec(project, env, endpoints, groups, postCodeByEndpoint), nil
}

// buildOpenAPISpec constructs an OpenAPI 3.0 specification scoped to one env.
func buildOpenAPISpec(project *domain.Project, env *domain.ProjectEnvironment, endpoints []*domain.APIEndpoint, groups []*domain.APIGroup, postCodeByEndpoint map[int64]string) map[string]interface{} {
	groupMap := make(map[int64]string)
	for _, g := range groups {
		groupMap[g.ID] = g.Name
	}

	secSchemes, globalSecurity := buildSecuritySchemes(project.AuthType)

	// Build top-level tags from groups; collect tags used by the endpoint set.
	usedTags := map[string]bool{}
	paths := make(map[string]interface{})
	for _, ep := range endpoints {
		fullPath := fmt.Sprintf("/-/%s/{tenantSlug}/{projectSlug}%s", env.Name, toOpenAPIPath(ep.Path))
		pathItem, exists := paths[fullPath]
		if !exists {
			pathItem = make(map[string]interface{})
		}
		pathMap := pathItem.(map[string]interface{})
		groupName := groupMap[ep.GroupID]
		op := buildOperation(ep, groupName, postCodeByEndpoint[ep.ID])
		pathMap[strings.ToLower(ep.Method)] = op
		paths[fullPath] = pathMap
		if tags, ok := op["tags"].([]string); ok && len(tags) > 0 {
			usedTags[tags[0]] = true
		}
	}

	// Top-level tag objects for Swagger UI grouping.
	var tagDefs []interface{}
	for _, g := range groups {
		if usedTags[g.Name] {
			tagDefs = append(tagDefs, map[string]interface{}{"name": g.Name})
		}
	}
	// Append any inferred tags (endpoints with no group).
	for tag := range usedTags {
		found := false
		for _, g := range groups {
			if g.Name == tag {
				found = true
				break
			}
		}
		if !found {
			tagDefs = append(tagDefs, map[string]interface{}{"name": tag})
		}
	}

	spec := map[string]interface{}{
		"openapi": "3.0.3",
		"info": map[string]interface{}{
			"title":       fmt.Sprintf("%s (%s)", project.Name, env.Name),
			"description": project.Description,
			"version":     "1.0.0",
		},
		"servers": []interface{}{
			map[string]interface{}{
				"url":         fmt.Sprintf("/-/%s/{tenantSlug}/{projectSlug}", env.Name),
				"description": env.Name,
			},
		},
		"paths": paths,
	}
	if len(tagDefs) > 0 {
		spec["tags"] = tagDefs
	}

	// Assemble components: security schemes only.
	if len(secSchemes) > 0 {
		spec["components"] = map[string]interface{}{"securitySchemes": secSchemes}
		spec["security"] = globalSecurity
	}

	return spec
}

// buildSecuritySchemes returns the securitySchemes map and global security
// requirement array based on the project's auth type.
func buildSecuritySchemes(authType domain.AuthType) (map[string]interface{}, []interface{}) {
	switch authType {
	case domain.AuthTypeAPIKey:
		return map[string]interface{}{
			"ApiKeyAuth": map[string]interface{}{
				"type":        "http",
				"scheme":      "bearer",
				"description": "在 Authorization 头中传入 API Key，格式：Bearer <key>",
			},
		}, []interface{}{map[string]interface{}{"ApiKeyAuth": []interface{}{}}}

	case domain.AuthTypeJWT:
		return map[string]interface{}{
			"JwtAuth": map[string]interface{}{
				"type":         "http",
				"scheme":       "bearer",
				"bearerFormat": "JWT",
				"description":  "在 Authorization 头中传入 JWT Token，格式：Bearer <token>",
			},
		}, []interface{}{map[string]interface{}{"JwtAuth": []interface{}{}}}

	default:
		return nil, nil
	}
}

// buildOperation builds one OpenAPI operation object for a single endpoint.
func buildOperation(ep *domain.APIEndpoint, groupName string, scriptCode string) map[string]interface{} {
	tags := []string{groupName}
	if groupName == "" {
		tags = inferTags(ep.Path)
	}

	op := map[string]interface{}{
		"summary":     ep.Summary,
		"description": ep.Description,
		"operationId": buildOperationID(ep.Path, ep.Method),
		"tags":        tags,
	}

	// Split params into: path params (in: path), query params (in: query for GET),
	// and body params (requestBody for POST/PUT/DELETE/PATCH).
	isGet := strings.ToUpper(ep.Method) == "GET"
	pathParamSet := map[string]bool{}
	for _, name := range rePathParam.FindAllStringSubmatch(ep.Path, -1) {
		pathParamSet[name[1]] = true
	}

	// Always declare path parameters first.
	var parameters []interface{}
	for name := range pathParamSet {
		param := map[string]interface{}{
			"name": name, "in": "path", "required": true,
			"schema": map[string]interface{}{"type": "string"},
		}
		for _, def := range ep.ParamDefs {
			if def.Name == name {
				param["schema"] = map[string]interface{}{"type": mapParamType(def.Type)}
				if def.Desc != "" {
					param["description"] = def.Desc
				}
				break
			}
		}
		parameters = append(parameters, param)
	}

	// Non-path params: query for GET, requestBody for mutating methods.
	var bodyDefs []domain.ParamDef
	for _, def := range ep.ParamDefs {
		if pathParamSet[def.Name] {
			continue // already handled above
		}
		if isGet {
			s := map[string]interface{}{"type": mapParamType(def.Type)}
			if def.Default != "" {
				s["default"] = formatDefault(def.Default, def.Type)
			}
			param := map[string]interface{}{
				"name": def.Name, "in": "query",
				"required": def.Required, "schema": s,
			}
			if def.Desc != "" {
				param["description"] = def.Desc
			}
			parameters = append(parameters, param)
		} else {
			bodyDefs = append(bodyDefs, def)
		}
	}
	if len(parameters) > 0 {
		op["parameters"] = parameters
	}
	if len(bodyDefs) > 0 {
		properties := make(map[string]interface{})
		var required []string
		for _, def := range bodyDefs {
			prop := map[string]interface{}{"type": mapParamType(def.Type), "description": def.Desc}
			if def.Default != "" {
				prop["default"] = formatDefault(def.Default, def.Type)
			}
			properties[def.Name] = prop
			if def.Required {
				required = append(required, def.Name)
			}
		}
		bodySchema := map[string]interface{}{"type": "object", "properties": properties}
		if len(required) > 0 {
			bodySchema["required"] = required
		}
		op["requestBody"] = map[string]interface{}{
			"required": len(required) > 0,
			"content":  map[string]interface{}{"application/json": map[string]interface{}{"schema": bodySchema}},
		}
	}

	// Build response_defs → OpenAPI properties map.
	itemProps := make(map[string]interface{}, len(ep.ResponseDefs))
	for _, d := range ep.ResponseDefs {
		prop := map[string]interface{}{"type": mapParamType(d.Type)}
		if d.Desc != "" {
			prop["description"] = d.Desc
		}
		itemProps[d.Name] = prop
	}

	// Derive response schema: run schema() from the post script via goja,
	// recursively inject item properties at [] / {} placeholders.
	var responseSchema interface{}
	if scriptCode != "" {
		if skeleton := runSchemaSkeleton(scriptCode); skeleton != nil {
			responseSchema = buildOpenAPISchemaNode(skeleton, itemProps)
		}
	}
	if responseSchema == nil {
		items := map[string]interface{}{"type": "object"}
		if len(itemProps) > 0 {
			items["properties"] = itemProps
		}
		responseSchema = map[string]interface{}{"type": "array", "items": items}
	}

	errorSchema := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"code":    map[string]interface{}{"type": "integer"},
			"message": map[string]interface{}{"type": "string"},
		},
	}
	op["responses"] = map[string]interface{}{
		"200": map[string]interface{}{
			"description": "请求成功",
			"content": map[string]interface{}{
				"application/json": map[string]interface{}{
					"schema": responseSchema,
				},
			},
		},
		"400": map[string]interface{}{
			"description": "请求参数错误",
			"content":     map[string]interface{}{"application/json": map[string]interface{}{"schema": errorSchema}},
		},
		"401": map[string]interface{}{
			"description": "未授权",
			"content":     map[string]interface{}{"application/json": map[string]interface{}{"schema": errorSchema}},
		},
		"500": map[string]interface{}{
			"description": "服务器内部错误",
			"content":     map[string]interface{}{"application/json": map[string]interface{}{"schema": errorSchema}},
		},
	}

	return op
}

// runSchemaSkeleton executes the schema() function in the post script via goja
// and returns the exported Go value (map / slice / string).
func runSchemaSkeleton(code string) interface{} {
	vm := goja.New()
	timer := time.AfterFunc(2*time.Second, func() { vm.Interrupt("timeout") })
	defer timer.Stop()
	if _, err := vm.RunString(code); err != nil {
		return nil
	}
	fn, ok := goja.AssertFunction(vm.Get("schema"))
	if !ok {
		return nil
	}
	result, err := fn(goja.Undefined())
	if err != nil {
		return nil
	}
	return result.Export()
}

// buildOpenAPISchemaNode recursively converts a schema() skeleton into an OpenAPI
// schema object. [] and {} are placeholders: [] becomes an array of inline item
// objects, {} becomes an inline item object.
func buildOpenAPISchemaNode(node interface{}, itemProps map[string]interface{}) interface{} {
	switch v := node.(type) {
	case []interface{}:
		// [] placeholder → array of resource items
		obj := map[string]interface{}{"type": "object"}
		if len(itemProps) > 0 {
			obj["properties"] = itemProps
		}
		return map[string]interface{}{"type": "array", "items": obj}

	case map[string]interface{}:
		if len(v) == 0 {
			// {} placeholder → single resource item
			obj := map[string]interface{}{"type": "object"}
			if len(itemProps) > 0 {
				obj["properties"] = itemProps
			}
			return obj
		}
		// Fixed structure (e.g. pagination wrapper) → recurse into each key
		props := make(map[string]interface{}, len(v))
		for key, val := range v {
			props[key] = buildOpenAPISchemaNode(val, itemProps)
		}
		return map[string]interface{}{"type": "object", "properties": props}

	case string:
		return map[string]interface{}{"type": mapParamType(v)}

	default:
		return map[string]interface{}{"type": "object"}
	}
}

// toOpenAPIPath converts Express-style :param to OpenAPI {param}.
func toOpenAPIPath(path string) string {
	return rePathParam.ReplaceAllString(path, "{$1}")
}

func inferTags(path string) []string {
	for _, p := range strings.Split(strings.Trim(path, "/"), "/") {
		if p != "" && p != "api" && p != "v1" && p != "v2" {
			return []string{p}
		}
	}
	return []string{"Default"}
}

func buildOperationID(path string, method string) string {
	if method == "" {
		method = "get"
	} else {
		method = strings.ToLower(method)
	}
	// :param → ById / BySlug etc.
	path = rePathParam.ReplaceAllStringFunc(path, func(s string) string {
		name := s[1:] // strip leading ':'
		return "By" + strings.ToUpper(name[:1]) + name[1:]
	})
	parts := strings.Split(strings.Trim(path, "/"), "/")
	var meaningful []string
	for _, p := range parts {
		if p != "" && p != "api" && p != "v1" && p != "v2" {
			meaningful = append(meaningful, p)
		}
	}
	if len(meaningful) == 0 {
		return method + "Root"
	}
	var sb strings.Builder
	sb.WriteString(method)
	for _, p := range meaningful {
		sb.WriteString(strings.ToUpper(p[:1]) + p[1:])
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
