package domain

import (
	"strings"
	"time"
)

type Project struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type DataSource struct {
	ID        int64            `json:"id"`
	TenantID  int64            `json:"tenant_id"`
	Name      string           `json:"name"`
	IsDual    bool             `json:"is_dual"`
	Type      string           `json:"type"`
	Envs      []*DataSourceEnv `json:"envs,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
}

type DataSourceEnv struct {
	ID           int64  `json:"id"`
	DataSourceID int64  `json:"datasource_id"`
	Env          string `json:"env"` // dev, prod
	DSN          string `json:"dsn,omitempty"`
	GatewayID    int64  `json:"gateway_id"`
}

// ParamDef describes a single API parameter for OpenAPI spec generation.
type ParamDef struct {
	Name     string `json:"name"`
	Type     string `json:"type"`               // string, integer, number, boolean
	Required bool   `json:"required"`
	Default  string `json:"default,omitempty"`
	Desc     string `json:"desc,omitempty"`
}

type APIGroup struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	ProjectID   int64     `json:"project_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type APIEndpoint struct {
	ID           int64      `json:"id"`
	TenantID     int64      `json:"tenant_id"`
	ProjectID    int64      `json:"project_id"`
	GroupID      int64      `json:"group_id"`
	DataSourceID int64      `json:"datasource_id"`
	Path         string     `json:"path"`
	Methods      []string   `json:"methods"`
	Summary      string     `json:"summary"`
	Description  string     `json:"description,omitempty"`
	SQL          string     `json:"sql"`
	Params       []string   `json:"params"`
	ParamDefs    []ParamDef `json:"param_defs,omitempty"`
	PreScriptID  int64      `json:"pre_script_id,omitempty"`
	PostScriptID int64      `json:"post_script_id,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// Script is a reusable JavaScript snippet that can be attached to endpoints.
type Script struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"` // "pre" or "post"
	Code        string    `json:"code"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// InferMeta auto-fills Summary, Description, and ParamDefs from SQL and Path
// when they are not provided by the user.
func (ep *APIEndpoint) InferMeta() {
	sql := strings.TrimSpace(strings.ToUpper(ep.SQL))

	if ep.Summary == "" {
		ep.Summary = inferSummary(ep.Path, sql)
	}
	if ep.Description == "" {
		ep.Description = inferDescription(sql)
	}
	if len(ep.ParamDefs) == 0 && len(ep.Params) > 0 {
		ep.ParamDefs = inferParamDefs(ep.Params, ep.SQL)
	}
}

func inferSummary(path, sql string) string {
	// Extract last meaningful segment: /api/users/list → "users list"
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) >= 2 {
		resource := parts[len(parts)-2]
		action := parts[len(parts)-1]
		return resource + "/" + action
	}
	if len(parts) >= 1 {
		return parts[len(parts)-1]
	}
	return path
}

func inferDescription(sql string) string {
	switch {
	case strings.HasPrefix(sql, "SELECT"):
		return "查询数据"
	case strings.HasPrefix(sql, "INSERT"):
		return "新增记录"
	case strings.HasPrefix(sql, "UPDATE"):
		return "更新记录"
	case strings.HasPrefix(sql, "DELETE"):
		return "删除记录"
	default:
		return ""
	}
}

// inferParamDefs guesses parameter types from SQL context.
// Rules: column names containing "id","count","quantity","stock" → integer,
// "price","total","amount" → number, everything else → string.
// All params in WHERE/VALUES are required by default.
func inferParamDefs(params []string, sql string) []ParamDef {
	defs := make([]ParamDef, 0, len(params))
	for _, p := range params {
		def := ParamDef{Name: p, Type: inferType(p), Required: true}
		defs = append(defs, def)
	}
	return defs
}

func inferType(name string) string {
	n := strings.ToLower(name)
	switch {
	case strings.HasSuffix(n, "_id") || n == "id" || strings.Contains(n, "count") ||
		n == "quantity" || n == "stock" || n == "page" || n == "size":
		return "integer"
	case strings.Contains(n, "price") || strings.Contains(n, "total") ||
		strings.Contains(n, "amount") || strings.Contains(n, "rate"):
		return "number"
	case strings.Contains(n, "is_") || strings.Contains(n, "enabled") || strings.Contains(n, "active"):
		return "boolean"
	default:
		return "string"
	}
}
