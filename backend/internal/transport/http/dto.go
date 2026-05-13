package http

// ---- Swagger Response Types ----
// These types are used only for swagger @Success annotations to generate typed SDK.

type UserResp struct {
	ID           int64  `json:"id"            validate:"required"`
	Email        string `json:"email"         validate:"required"`
	Name         string `json:"name"          validate:"required"`
	IsSuperAdmin bool   `json:"is_superadmin" validate:"required"`
	CreatedAt    string `json:"created_at"    validate:"required"`
	UpdatedAt    string `json:"updated_at"    validate:"required"`
}

type TenantResp struct {
	ID                 int64  `json:"id"                   validate:"required"`
	Name               string `json:"name"                 validate:"required"`
	Slug               string `json:"slug"                 validate:"required"`
	Plan               string `json:"plan"                 validate:"required"`
	Status             string `json:"status"               validate:"required"`
	MaxReleaseVersions int    `json:"max_release_versions" validate:"required"`
	Avatar             string `json:"avatar,omitempty"`
	CreatedAt          string `json:"created_at"           validate:"required"`
	UpdatedAt          string `json:"updated_at"           validate:"required"`
}

type TenantUserResp struct {
	TenantID int64     `json:"tenant_id" validate:"required"`
	UserID   int64     `json:"user_id"   validate:"required"`
	Role     string    `json:"role"      validate:"required"`
	JoinedAt string    `json:"joined_at" validate:"required"`
	User     *UserResp `json:"user,omitempty"`
}

type GatewayResp struct {
	ID         int64  `json:"id"                   validate:"required"`
	TenantID   int64  `json:"tenant_id,omitempty"`
	IsPlatform bool   `json:"is_platform"          validate:"required"`
	Name       string `json:"name"                 validate:"required"`
	Token      string `json:"token,omitempty"`
	Status     string `json:"status"               validate:"required"`
	IP         string `json:"ip"                   validate:"required"`
	LastSeen   string `json:"last_seen"            validate:"required"`
	Version    string `json:"version"              validate:"required"`
}

type DataSourceEnvResp struct {
	ID           int64  `json:"id"            validate:"required"`
	DataSourceID int64  `json:"datasource_id" validate:"required"`
	Env          string `json:"env"           validate:"required"`
	DSN          string `json:"dsn,omitempty"`
	GatewayID    int64  `json:"gateway_id"    validate:"required"`
}

type DataSourceResp struct {
	ID         int64               `json:"id"          validate:"required"`
	TenantID   int64               `json:"tenant_id"   validate:"required"`
	Name       string              `json:"name"        validate:"required"`
	IsDual     bool                `json:"is_dual"     validate:"required"`
	IsPlatform bool                `json:"is_platform" validate:"required"`
	Type       string              `json:"type"        validate:"required"`
	Envs       []DataSourceEnvResp `json:"envs,omitempty"`
	CreatedAt  string              `json:"created_at"  validate:"required"`
}

type ProjectResp struct {
	ID          int64  `json:"id"          validate:"required"`
	TenantID    int64  `json:"tenant_id"   validate:"required"`
	Slug        string `json:"slug"        validate:"required"`
	Name        string `json:"name"        validate:"required"`
	Description string `json:"description" validate:"required"`
	Avatar      string `json:"avatar,omitempty"`
	CreatedAt   string `json:"created_at"  validate:"required"`
}

type ParamDefResp struct {
	Name     string `json:"name"     validate:"required"`
	Type     string `json:"type"     validate:"required"`
	Required bool   `json:"required" validate:"required"`
	Default  string `json:"default,omitempty"`
	Desc     string `json:"desc,omitempty"`
}

type APIEndpointResp struct {
	ID                 int64          `json:"id"                           validate:"required"`
	TenantID           int64          `json:"tenant_id"                    validate:"required"`
	ProjectID          int64          `json:"project_id"                   validate:"required"`
	GroupID            int64          `json:"group_id"                     validate:"required"`
	DataSourceID       int64          `json:"datasource_id"                validate:"required"`
	Path               string         `json:"path"                         validate:"required"`
	Methods            []string       `json:"methods"                      validate:"required"`
	Summary            string         `json:"summary"                      validate:"required"`
	Description        string         `json:"description,omitempty"`
	SQL                string         `json:"sql"                          validate:"required"`
	Params             []string       `json:"params"                       validate:"required"`
	ParamDefs          []ParamDefResp `json:"param_defs,omitempty"`
	PreScriptID        int64          `json:"pre_script_id,omitempty"`
	PostScriptID       int64          `json:"post_script_id,omitempty"`
	Status             string         `json:"status"                       validate:"required"`
	PublishedReleaseID int64          `json:"published_release_id,omitempty"`
	HasDraft           bool           `json:"has_draft,omitempty"`
	CreatedAt          string         `json:"created_at"                   validate:"required"`
}

type APIGroupResp struct {
	ID          int64  `json:"id"          validate:"required"`
	TenantID    int64  `json:"tenant_id"   validate:"required"`
	ProjectID   int64  `json:"project_id"  validate:"required"`
	Name        string `json:"name"        validate:"required"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at"  validate:"required"`
}

type ScriptResp struct {
	ID          int64  `json:"id"          validate:"required"`
	TenantID    int64  `json:"tenant_id,omitempty"`
	IsPlatform  bool   `json:"is_platform" validate:"required"`
	Name        string `json:"name"        validate:"required"`
	Type        string `json:"type"        validate:"required"`
	Code        string `json:"code"        validate:"required"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at"  validate:"required"`
}

type PlatformSettingsResp struct {
	AllowSelfRegister bool `json:"allow_self_register" validate:"required"`
}

type AuthResp struct {
	User    UserResp     `json:"user"             validate:"required"`
	Token   string       `json:"token"            validate:"required"`
	Tenant  *TenantResp  `json:"tenant,omitempty"`
	Tenants []TenantResp `json:"tenants,omitempty"`
}

// Paginated response wrappers for swagger
type TenantListResp struct {
	List       []TenantResp   `json:"list"       validate:"required"`
	Pagination PaginationInfo `json:"pagination" validate:"required"`
}
type TenantUserListResp struct {
	List       []TenantUserResp `json:"list"       validate:"required"`
	Pagination PaginationInfo   `json:"pagination" validate:"required"`
}
type GatewayListResp struct {
	List       []GatewayResp  `json:"list"       validate:"required"`
	Pagination PaginationInfo `json:"pagination" validate:"required"`
}
type DataSourceListResp struct {
	List       []DataSourceResp `json:"list"       validate:"required"`
	Pagination PaginationInfo   `json:"pagination" validate:"required"`
}
type ProjectListResp struct {
	List       []ProjectResp  `json:"list"       validate:"required"`
	Pagination PaginationInfo `json:"pagination" validate:"required"`
}
type APIEndpointListResp struct {
	List       []APIEndpointResp `json:"list"       validate:"required"`
	Pagination PaginationInfo    `json:"pagination" validate:"required"`
}
type APIGroupListResp struct {
	List       []APIGroupResp `json:"list"       validate:"required"`
	Pagination PaginationInfo `json:"pagination" validate:"required"`
}
type ScriptListResp struct {
	List       []ScriptResp   `json:"list"       validate:"required"`
	Pagination PaginationInfo `json:"pagination" validate:"required"`
}

// Typed R wrappers for swagger
type RAuth struct {
	Code int      `json:"code" validate:"required"`
	Msg  string   `json:"msg"  validate:"required"`
	Data AuthResp `json:"data" validate:"required"`
}
type RTenant struct {
	Code int        `json:"code" validate:"required"`
	Msg  string     `json:"msg"  validate:"required"`
	Data TenantResp `json:"data" validate:"required"`
}
type RTenantList struct {
	Code int            `json:"code" validate:"required"`
	Msg  string         `json:"msg"  validate:"required"`
	Data TenantListResp `json:"data" validate:"required"`
}
type RTenantUserList struct {
	Code int                `json:"code" validate:"required"`
	Msg  string             `json:"msg"  validate:"required"`
	Data TenantUserListResp `json:"data" validate:"required"`
}
type RGateway struct {
	Code int         `json:"code" validate:"required"`
	Msg  string      `json:"msg"  validate:"required"`
	Data GatewayResp `json:"data" validate:"required"`
}
type RGatewayList struct {
	Code int             `json:"code" validate:"required"`
	Msg  string          `json:"msg"  validate:"required"`
	Data GatewayListResp `json:"data" validate:"required"`
}
type RDataSource struct {
	Code int            `json:"code" validate:"required"`
	Msg  string         `json:"msg"  validate:"required"`
	Data DataSourceResp `json:"data" validate:"required"`
}
type RDataSourceList struct {
	Code int                `json:"code" validate:"required"`
	Msg  string             `json:"msg"  validate:"required"`
	Data DataSourceListResp `json:"data" validate:"required"`
}
type RProject struct {
	Code int         `json:"code" validate:"required"`
	Msg  string      `json:"msg"  validate:"required"`
	Data ProjectResp `json:"data" validate:"required"`
}
type RProjectList struct {
	Code int             `json:"code" validate:"required"`
	Msg  string          `json:"msg"  validate:"required"`
	Data ProjectListResp `json:"data" validate:"required"`
}
type RAPIEndpoint struct {
	Code int             `json:"code" validate:"required"`
	Msg  string          `json:"msg"  validate:"required"`
	Data APIEndpointResp `json:"data" validate:"required"`
}
type RAPIEndpointList struct {
	Code int                 `json:"code" validate:"required"`
	Msg  string              `json:"msg"  validate:"required"`
	Data APIEndpointListResp `json:"data" validate:"required"`
}
type RAPIGroup struct {
	Code int          `json:"code" validate:"required"`
	Msg  string       `json:"msg"  validate:"required"`
	Data APIGroupResp `json:"data" validate:"required"`
}
type RAPIGroupList struct {
	Code int              `json:"code" validate:"required"`
	Msg  string           `json:"msg"  validate:"required"`
	Data APIGroupListResp `json:"data" validate:"required"`
}
type RScript struct {
	Code int        `json:"code" validate:"required"`
	Msg  string     `json:"msg"  validate:"required"`
	Data ScriptResp `json:"data" validate:"required"`
}
type RScriptList struct {
	Code int            `json:"code" validate:"required"`
	Msg  string         `json:"msg"  validate:"required"`
	Data ScriptListResp `json:"data" validate:"required"`
}
type RPlatformSettings struct {
	Code int                  `json:"code" validate:"required"`
	Msg  string               `json:"msg"  validate:"required"`
	Data PlatformSettingsResp `json:"data" validate:"required"`
}
