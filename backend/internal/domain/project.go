package domain

import (
	"strings"
	"time"
)

// AuthType enumerates project-level access control modes.
type AuthType string

const (
	AuthTypePublic AuthType = "public"
	AuthTypeAPIKey AuthType = "api_key"
	AuthTypeJWT    AuthType = "jwt"
)

// ProjectAuthKey is a single auth key row stored in the project_auth_keys table.
type ProjectAuthKey struct {
	ID        string     `json:"id"`
	TenantID  int64      `json:"tenant_id"`
	ProjectID int64      `json:"project_id"`
	Type      AuthType   `json:"type"` // "api_key" or "jwt"
	Name      string     `json:"name"`
	Value     string     `json:"value"` // sk-xxx for api_key, base64 secret for jwt
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type Project struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Avatar      string    `json:"avatar"`
	AuthType    AuthType  `json:"auth_type"`
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

// ResponseDef describes a single field in the API response body.
type ResponseDef struct {
	Name string `json:"name"`
	Type string `json:"type"` // string, integer, number, boolean
	Desc string `json:"desc,omitempty"`
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
	ID              int64         `json:"id"`
	TenantID        int64         `json:"tenant_id"`
	ProjectID       int64         `json:"project_id"`
	GroupID         int64         `json:"group_id"`
	DataSourceAlias string        `json:"datasource_alias"`
	Path            string        `json:"path"`
	Method          string        `json:"method"`
	Summary         string        `json:"summary"`
	Description     string        `json:"description,omitempty"`
	SQL             string        `json:"sql"`
	ParamDefs       []ParamDef    `json:"param_defs,omitempty"`
	ResponseDefs    []ResponseDef `json:"response_defs,omitempty"`
	// PreScripts / PostScripts are ordered chains run sequentially around the SQL.
	// Each step is either a reference to a reusable library script or inline code
	// stored on the endpoint itself (see ScriptStep). In the pre-chain each stage's
	// output params feed the next and any `{ error }` short-circuits; in the
	// post-chain each stage's output becomes the next stage's `data`, and the last
	// stage's output is the response body.
	PreScripts  []ScriptStep `json:"pre_scripts,omitempty"`
	PostScripts []ScriptStep `json:"post_scripts,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`

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

// ScriptStepSource enumerates where a chain step's code comes from.
const (
	ScriptStepLibrary = "library" // references a reusable script in the library by ScriptID
	ScriptStepInline  = "inline"  // code authored on the endpoint itself
)

// ScriptStep is one step in an endpoint's pre/post chain. It is either a
// reference to a library script (Source=library, ScriptID set) or inline code
// stored on the endpoint (Source=inline, Name+Code set).
type ScriptStep struct {
	Source   string `json:"source"`
	ScriptID int64  `json:"script_id,omitempty"`
	Name     string `json:"name,omitempty"`
	Code     string `json:"code,omitempty"`
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
	ID                  int64            `json:"id"`
	TenantID            int64            `json:"tenant_id"`
	EndpointID          int64            `json:"endpoint_id"`
	Version             int              `json:"version"`
	Snapshot            *APIEndpoint     `json:"snapshot"`
	SnapshotV           int              `json:"snapshot_v"`
	PreScriptSnapshots  []ScriptSnapshot `json:"pre_script_snapshots,omitempty"`
	PostScriptSnapshots []ScriptSnapshot `json:"post_script_snapshots,omitempty"`
	DataSourceRef       *DataSourceRef   `json:"datasource_ref,omitempty"`
	Note                string           `json:"note"`
	CreatedBy           int64            `json:"created_by"`
	CreatedAt           time.Time        `json:"created_at"`
	IsActive            bool             `json:"is_active"`
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
	ActivationActionVersionCreate ActivationAction = "version_create"
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
	ID          int64             `json:"id"`
	TenantID    int64             `json:"tenant_id"`
	EndpointID  int64             `json:"endpoint_id"`
	EnvID       int64             `json:"env_id,omitempty"`
	EnvName     string            `json:"env_name,omitempty"`
	VersionID   int64             `json:"version_id,omitempty"`
	Version     int               `json:"version,omitempty"`
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Params      CallLogParams     `json:"params,omitempty"`
	PathParams  map[string]string `json:"path_params,omitempty"`
	QueryParams map[string]string `json:"query_params,omitempty"`
	BodyParams  map[string]string `json:"body_params,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Status      int               `json:"status"`
	LatencyMs   int               `json:"latency_ms"`
	Error       string            `json:"error,omitempty"`
	IP          string            `json:"ip,omitempty"`
	UserAgent   string            `json:"user_agent,omitempty"`
	At          time.Time         `json:"at"`
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

// RecentActivation 是概览「最近动态」里一条资产变更事件的扁平视图（已 join 出端点/环境/操作人）。
type RecentActivation struct {
	Action          ActivationAction
	EndpointSummary string // 端点摘要，可能为空
	Path            string
	Method          string
	EnvName         string
	Version         int
	ActorName       string
	At              time.Time
}

// ActivityEvent 是概览「最近动态」对外的统一事件：合并资产变更 + 流量异常后按时间倒序。
type ActivityEvent struct {
	Type     string    // "api"（资产变更）/ "error"（5xx）/ "slow"（慢查询）
	Title    string    // 端点摘要或 "METHOD path"
	Desc     string    // 人类可读描述
	Severity string    // "info" / "warning" / "error"
	At       time.Time // 事件时间
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
	// RefCount is how many endpoints reference this script (library steps in
	// their pre/post chains). Computed on List; not a stored column.
	RefCount int `json:"ref_count"`
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

// OpenAPIShareToken represents a persistent public share link for a project's OpenAPI spec.
type OpenAPIShareToken struct {
	Token     string    `json:"token"`
	TenantID  int64     `json:"tenant_id"`
	ProjectID int64     `json:"project_id"`
	Env       string    `json:"env"`
	CreatedAt time.Time `json:"created_at"`
}
