package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
)

// R is the unified response: { code, msg, data }
type R struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Data any    `json:"data,omitempty"`
}

type PaginationInfo struct {
	IsPager int `json:"is_pager"`
	Page    int `json:"page"`
	Size    int `json:"size"`
	Total   int `json:"total"`
}

type PaginatedData struct {
	List       any            `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}

// ---- Swagger Response Types ----
// These types are used only for swagger @Success annotations to generate typed SDK.

type UserResp struct {
	ID           int64  `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	IsSuperAdmin bool   `json:"is_superadmin"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

type TenantResp struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Plan      string `json:"plan"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type TenantUserResp struct {
	TenantID int64     `json:"tenant_id"`
	UserID   int64     `json:"user_id"`
	Role     string    `json:"role"`
	JoinedAt string    `json:"joined_at"`
	User     *UserResp `json:"user,omitempty"`
}

type GatewayResp struct {
	ID       int64  `json:"id"`
	TenantID int64  `json:"tenant_id"`
	Name     string `json:"name"`
	Token    string `json:"token,omitempty"`
	Status   string `json:"status"`
	IP       string `json:"ip"`
	LastSeen string `json:"last_seen"`
	Version  string `json:"version"`
}

type DataSourceEnvResp struct {
	ID           int64  `json:"id"`
	DataSourceID int64  `json:"datasource_id"`
	Env          string `json:"env"`
	DSN          string `json:"dsn,omitempty"`
	GatewayID    int64  `json:"gateway_id"`
}

type DataSourceResp struct {
	ID        int64               `json:"id"`
	TenantID  int64               `json:"tenant_id"`
	Name      string              `json:"name"`
	IsDual    bool                `json:"is_dual"`
	Type      string              `json:"type"`
	Envs      []DataSourceEnvResp `json:"envs,omitempty"`
	CreatedAt string              `json:"created_at"`
}

type ProjectResp struct {
	ID          int64  `json:"id"`
	TenantID    int64  `json:"tenant_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

type ParamDefResp struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
	Default  string `json:"default,omitempty"`
	Desc     string `json:"desc,omitempty"`
}

type APIEndpointResp struct {
	ID           int64          `json:"id"`
	TenantID     int64          `json:"tenant_id"`
	ProjectID    int64          `json:"project_id"`
	GroupID      int64          `json:"group_id"`
	DataSourceID int64          `json:"datasource_id"`
	Path         string         `json:"path"`
	Methods      []string       `json:"methods"`
	Summary      string         `json:"summary"`
	Description  string         `json:"description,omitempty"`
	SQL          string         `json:"sql"`
	Params       []string       `json:"params"`
	ParamDefs    []ParamDefResp `json:"param_defs,omitempty"`
	PreScriptID  int64          `json:"pre_script_id,omitempty"`
	PostScriptID int64          `json:"post_script_id,omitempty"`
	CreatedAt    string         `json:"created_at"`
}

type APIGroupResp struct {
	ID          int64  `json:"id"`
	TenantID    int64  `json:"tenant_id"`
	ProjectID   int64  `json:"project_id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at"`
}

type ScriptResp struct {
	ID          int64  `json:"id"`
	TenantID    int64  `json:"tenant_id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Code        string `json:"code"`
	Description string `json:"description,omitempty"`
	CreatedAt   string `json:"created_at"`
}

type AuthResp struct {
	User    UserResp     `json:"user"`
	Token   string       `json:"token"`
	Tenant  *TenantResp  `json:"tenant,omitempty"`
	Tenants []TenantResp `json:"tenants,omitempty"`
}

// Paginated response wrappers for swagger
type TenantListResp struct {
	List       []TenantResp   `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}
type TenantUserListResp struct {
	List       []TenantUserResp `json:"list"`
	Pagination PaginationInfo   `json:"pagination"`
}
type GatewayListResp struct {
	List       []GatewayResp  `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}
type DataSourceListResp struct {
	List       []DataSourceResp `json:"list"`
	Pagination PaginationInfo   `json:"pagination"`
}
type ProjectListResp struct {
	List       []ProjectResp  `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}
type APIEndpointListResp struct {
	List       []APIEndpointResp `json:"list"`
	Pagination PaginationInfo    `json:"pagination"`
}
type APIGroupListResp struct {
	List       []APIGroupResp `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}
type ScriptListResp struct {
	List       []ScriptResp   `json:"list"`
	Pagination PaginationInfo `json:"pagination"`
}

// Typed R wrappers for swagger
type RAuth struct {
	Code int      `json:"code"`
	Msg  string   `json:"msg"`
	Data AuthResp `json:"data"`
}
type RTenant struct {
	Code int        `json:"code"`
	Msg  string     `json:"msg"`
	Data TenantResp `json:"data"`
}
type RTenantList struct {
	Code int            `json:"code"`
	Msg  string         `json:"msg"`
	Data TenantListResp `json:"data"`
}
type RTenantUserList struct {
	Code int                `json:"code"`
	Msg  string             `json:"msg"`
	Data TenantUserListResp `json:"data"`
}
type RGateway struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data GatewayResp `json:"data"`
}
type RGatewayList struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data GatewayListResp `json:"data"`
}
type RDataSource struct {
	Code int            `json:"code"`
	Msg  string         `json:"msg"`
	Data DataSourceResp `json:"data"`
}
type RDataSourceList struct {
	Code int                `json:"code"`
	Msg  string             `json:"msg"`
	Data DataSourceListResp `json:"data"`
}
type RProject struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg"`
	Data ProjectResp `json:"data"`
}
type RProjectList struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data ProjectListResp `json:"data"`
}
type RAPIEndpoint struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data APIEndpointResp `json:"data"`
}
type RAPIEndpointList struct {
	Code int                 `json:"code"`
	Msg  string              `json:"msg"`
	Data APIEndpointListResp `json:"data"`
}
type RAPIGroup struct {
	Code int          `json:"code"`
	Msg  string       `json:"msg"`
	Data APIGroupResp `json:"data"`
}
type RAPIGroupList struct {
	Code int              `json:"code"`
	Msg  string           `json:"msg"`
	Data APIGroupListResp `json:"data"`
}
type RScript struct {
	Code int        `json:"code"`
	Msg  string     `json:"msg"`
	Data ScriptResp `json:"data"`
}
type RScriptList struct {
	Code int            `json:"code"`
	Msg  string         `json:"msg"`
	Data ScriptListResp `json:"data"`
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, R{Code: 0, Msg: "success", Data: data})
}

func OKPaged(c *gin.Context, list any, p domain.ListParams, total int) {
	pg := PaginationInfo{Total: total}
	if p.IsPaged() {
		pg.IsPager = 1
		pg.Page = p.Page
		pg.Size = p.Size
	}
	c.JSON(http.StatusOK, R{
		Code: 0,
		Msg:  "success",
		Data: PaginatedData{List: list, Pagination: pg},
	})
}

func Fail(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, R{Code: 1, Msg: msg})
}

// FailErr maps a domain.Error to the correct HTTP status; plain errors become 500.
func FailErr(c *gin.Context, err error) {
	if e, ok := err.(*domain.Error); ok {
		Fail(c, e.Code, e.Message)
		return
	}
	Fail(c, http.StatusInternalServerError, err.Error())
}

// pathInt64 parses a path parameter as int64. Returns (0, false) and writes a 400 response on failure.
func pathInt64(c *gin.Context, name string) (int64, bool) {
	v, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil {
		Fail(c, http.StatusBadRequest, "invalid "+name)
		return 0, false
	}
	return v, true
}

// parseListParams extracts page/size/keyword/is_pager from query string into domain.ListParams.
// When is_pager=0, Size is set to 0 (meaning no limit).
func parseListParams(c *gin.Context) domain.ListParams {
	p := domain.ListParams{Keyword: c.DefaultQuery("keyword", "")}

	if c.DefaultQuery("is_pager", "1") == "0" {
		p.Page = 1
		return p
	}

	p.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	p.Size, _ = strconv.Atoi(c.DefaultQuery("size", "10"))
	if p.Page < 1 {
		p.Page = 1
	}
	if p.Size < 1 || p.Size > 100 {
		p.Size = 10
	}
	return p
}
