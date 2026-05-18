package domain

import (
	"strings"
	"time"
)

type Project struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Avatar      string    `json:"avatar"`
	CreatedAt   time.Time `json:"created_at"`
}

// ParamDef describes a single API parameter for OpenAPI spec generation.
type ParamDef struct {
	Name     string `json:"name"`
	Type     string `json:"type"` // string, integer, number, boolean
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

// APIEndpoint represents the working-copy / draft of an endpoint.
// It is always mutable; what's "live" per-env is determined by EndpointActiveVersion.
//
// DataSourceAlias is a logical name; the physical datasource it resolves to is
// determined at call time by looking up endpoint_datasource_bindings for the
// requested env.
type APIEndpoint struct {
	ID              int64      `json:"id"`
	TenantID        int64      `json:"tenant_id"`
	ProjectID       int64      `json:"project_id"`
	GroupID         int64      `json:"group_id"`
	DataSourceAlias string     `json:"datasource_alias"`
	Path            string     `json:"path"`
	Methods         []string   `json:"methods"`
	Summary         string     `json:"summary"`
	Description     string     `json:"description,omitempty"`
	SQL             string     `json:"sql"`
	Params          []string   `json:"params"`
	ParamDefs       []ParamDef `json:"param_defs,omitempty"`
	PreScriptID     int64      `json:"pre_script_id,omitempty"`
	PostScriptID    int64      `json:"post_script_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Derived/computed fields (not stored on the row itself):
	HasDraft       bool                  `json:"has_draft"`                 // updated_at > MAX(activated_at) across envs, or no version yet
	LatestVersion  int                   `json:"latest_version,omitempty"`  // newest version number in endpoint_versions for this endpoint
	EnvActivations []EndpointEnvActivity `json:"env_activations,omitempty"` // per-env active version snapshot (one row per env where this endpoint is live)
}

// EndpointEnvActivity is a compact "what's live in env X" record returned alongside endpoints.
type EndpointEnvActivity struct {
	EnvID     int64  `json:"env_id"`
	EnvName   string `json:"env_name"`
	Version   int    `json:"version"`
	VersionID int64  `json:"version_id"`
}

// ScriptSnapshot is a frozen copy of a script captured into a version.
type ScriptSnapshot struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Code string `json:"code"`
}

// DataSourceRef is a frozen reference (NOT a snapshot of credentials) to a datasource alias.
// The alias is resolved at call time against (env, alias) bindings, so DSN/gateway changes
// flow through automatically without requiring new versions.
type DataSourceRef struct {
	Alias string `json:"alias"`
}

// EndpointVersion is an immutable published snapshot of an endpoint.
type EndpointVersion struct {
	ID                 int64           `json:"id"`
	TenantID           int64           `json:"tenant_id"`
	EndpointID         int64           `json:"endpoint_id"`
	Version            int             `json:"version"`
	Snapshot           *APIEndpoint    `json:"snapshot"`
	SnapshotV          int             `json:"snapshot_v"`
	PreScriptSnapshot  *ScriptSnapshot `json:"pre_script_snapshot,omitempty"`
	PostScriptSnapshot *ScriptSnapshot `json:"post_script_snapshot,omitempty"`
	DataSourceRef      *DataSourceRef  `json:"datasource_ref,omitempty"`
	Note               string          `json:"note"`
	CreatedBy          int64           `json:"created_by"`
	CreatedAt          time.Time       `json:"created_at"`
	IsActive           bool            `json:"is_active"`
}

// EndpointActiveVersion is the authoritative pointer to "what's live in (endpoint, env) now".
// PK is (tenant_id, endpoint_id, env_id) — different envs can pin different versions
// simultaneously, which is the basis for the promote / canary / rollback story.
type EndpointActiveVersion struct {
	TenantID    int64     `json:"tenant_id"`
	EndpointID  int64     `json:"endpoint_id"`
	EnvID       int64     `json:"env_id"`
	VersionID   int64     `json:"version_id"`
	Version     int       `json:"version"`
	ActivatedBy int64     `json:"activated_by"`
	ActivatedAt time.Time `json:"activated_at"`
}

// ActivationAction enumerates activation log entry kinds.
type ActivationAction string

const (
	ActivationActionPublish       ActivationAction = "publish"
	ActivationActionActivate      ActivationAction = "activate"
	ActivationActionRollback      ActivationAction = "rollback"
	ActivationActionUnpublish     ActivationAction = "unpublish"
	ActivationActionVersionDelete ActivationAction = "version_deleted"
	ActivationActionRevert        ActivationAction = "revert"
	ActivationActionPromote       ActivationAction = "promote"
)

// CallLogParams holds the de-serialized request params for an endpoint call.
// Stored as JSONB; nil means no params recorded.
type CallLogParams map[string]any

// EndpointCallLog represents one invocation of an endpoint via the gateway path
// /-/:env/:tenantSlug/:projectSlug/*path.
type EndpointCallLog struct {
	ID         int64         `json:"id"`
	TenantID   int64         `json:"tenant_id"`
	EndpointID int64         `json:"endpoint_id"`
	EnvID      int64         `json:"env_id,omitempty"`
	EnvName    string        `json:"env_name,omitempty"`
	VersionID  int64         `json:"version_id,omitempty"`
	Version    int           `json:"version,omitempty"`
	Method     string        `json:"method"`
	Path       string        `json:"path"`
	Params     CallLogParams `json:"params,omitempty"`
	Status     int           `json:"status"`
	LatencyMs  int           `json:"latency_ms"`
	Error      string        `json:"error,omitempty"`
	IP         string        `json:"ip,omitempty"`
	UserAgent  string        `json:"user_agent,omitempty"`
	At         time.Time     `json:"at"`
}

// CallLogFilter narrows what ListEndpointCallLogs returns.
type CallLogFilter struct {
	// "all" / "2xx" / "4xx" / "5xx" / "" → no filter
	StatusClass string
	// substring match on path OR error
	Keyword string
	// only include rows where at >= Since (zero value = no lower bound)
	Since time.Time
	// only include rows whose env_id == EnvID (0 = all envs)
	EnvID int64
}

// EndpointActivationLog is a single audit row.
type EndpointActivationLog struct {
	ID         int64            `json:"id"`
	TenantID   int64            `json:"tenant_id"`
	EndpointID int64            `json:"endpoint_id"`
	EnvID      int64            `json:"env_id,omitempty"`
	EnvName    string           `json:"env_name,omitempty"`
	VersionID  int64            `json:"version_id,omitempty"`
	Version    int              `json:"version,omitempty"` // 对应版本号 (v3)，便于直接展示
	Action     ActivationAction `json:"action"`
	ActorID    int64            `json:"actor_id"`
	ActorName  string           `json:"actor_name,omitempty"` // 操作人显示名（含超管）；空字符串=系统
	At         time.Time        `json:"at"`
}

// Script is a reusable JavaScript snippet that can be attached to endpoints.
type Script struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id,omitempty"`
	IsPlatform  bool      `json:"is_platform"`
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
