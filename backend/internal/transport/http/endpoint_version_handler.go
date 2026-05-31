package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type EndpointVersionHandler struct {
	versions service.EndpointVersionService
	envs     service.EnvironmentService
}

// resolveEnvID resolves an env_id from a query parameter on the request.
// Supports both `env_id=<int>` and `env=<name>`. If neither is provided, falls back
// to the project's default env. The projectID is read from the URL path.
func (h *EndpointVersionHandler) resolveEnvID(c *gin.Context, tenantID int64) (int64, bool) {
	if raw := c.Query("env_id"); raw != "" {
		if id, err := parseInt64(raw); err == nil && id > 0 {
			return id, true
		}
	}
	projectID, ok := pathInt64(c, "projectId")
	if !ok {
		return 0, false
	}
	if name := c.Query("env"); name != "" {
		env, err := h.envs.GetByName(c.Request.Context(), tenantID, projectID, name)
		if err != nil {
			Fail(c, http.StatusBadRequest, "env not found: "+name)
			return 0, false
		}
		return env.ID, true
	}
	def, err := h.envs.GetDefault(c.Request.Context(), tenantID, projectID)
	if err != nil {
		Fail(c, http.StatusBadRequest, "project has no default environment")
		return 0, false
	}
	return def.ID, true
}

// HandlePublish godoc
// @Summary 在某 env 发布接口（创建版本 + 激活）
// @ID publishEndpoint
// @Tags endpoint-version
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param env query string false "环境名（默认为项目默认 env）"
// @Param env_id query int false "环境ID（优先于 env）"
// @Param body body object{note=string} false "版本说明"
// @Success 200 {object} REndpointVersion
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/publish [post]
func (h *EndpointVersionHandler) HandlePublish(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	envID, ok := h.resolveEnvID(c, tenant.ID)
	if !ok {
		return
	}
	var req struct {
		Note string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	v, err := h.versions.Publish(c.Request.Context(), tenant.ID, epID, envID, claims.UserID, req.Note, tenant.MaxReleaseVersions)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, v)
}

// HandleCreateVersion godoc
// @Summary 创建版本快照（不激活任何 env）
// @ID createEndpointVersion
// @Tags endpoint-version
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param body body object{note=string} false "版本说明"
// @Success 200 {object} REndpointVersion
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/versions [post]
func (h *EndpointVersionHandler) HandleCreateVersion(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	var req struct {
		Note string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	v, err := h.versions.CreateVersion(c.Request.Context(), tenant.ID, epID, claims.UserID, req.Note, tenant.MaxReleaseVersions)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, v)
}

// HandleList godoc
// @Summary 查询版本历史
// @ID listEndpointVersions
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param page query int false "页码"
// @Param size query int false "每页数量"
// @Success 200 {object} REndpointVersionList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/versions [get]
func (h *EndpointVersionHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	list, total, err := h.versions.ListVersions(c.Request.Context(), tenant.ID, epID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleListActives godoc
// @Summary 列出该接口在各 env 的当前激活版本（per-env 激活快照）
// @ID listEndpointActives
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Success 200 {object} REndpointActiveVersionList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/actives [get]
func (h *EndpointVersionHandler) HandleListActives(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	list, err := h.versions.ListActiveByEndpoint(c.Request.Context(), tenant.ID, epID)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, list)
}

// HandleActivate godoc
// @Summary 在某 env 激活指定版本（=切换 / 回滚）
// @ID activateEndpointVersion
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param versionId path int true "版本ID"
// @Param env query string false "环境名"
// @Param env_id query int false "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/versions/{versionId}/activate [post]
func (h *EndpointVersionHandler) HandleActivate(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	versionID, ok := pathInt64(c, "versionId")
	if !ok {
		return
	}
	envID, ok := h.resolveEnvID(c, tenant.ID)
	if !ok {
		return
	}
	if err := h.versions.Activate(c.Request.Context(), tenant.ID, epID, envID, versionID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandlePromote godoc
// @Summary 把 source env 当前激活版本提升到 target env（无需新建 version）
// @ID promoteEndpointVersion
// @Tags endpoint-version
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param body body object{source_env_id=int,target_env_id=int} true "promote 参数"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/promote [post]
func (h *EndpointVersionHandler) HandlePromote(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	var req struct {
		SourceEnvID int64 `json:"source_env_id" binding:"required"`
		TargetEnvID int64 `json:"target_env_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.versions.Promote(c.Request.Context(), tenant.ID, epID, req.SourceEnvID, req.TargetEnvID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleListActivationLog godoc
// @Summary 查询接口激活流水
// @ID listEndpointActivationLog
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param page query int false "页码"
// @Param size query int false "每页数量"
// @Success 200 {object} REndpointActivationLogList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/activation-log [get]
func (h *EndpointVersionHandler) HandleListActivationLog(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	list, total, err := h.versions.ListActivationLog(c.Request.Context(), tenant.ID, epID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleDeleteVersion godoc
// @Summary 删除指定版本（不可恢复）
// @Description 任何 env 仍激活该版本时不可删除
// @ID deleteEndpointVersion
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param versionId path int true "版本ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/versions/{versionId} [delete]
func (h *EndpointVersionHandler) HandleDeleteVersion(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	versionID, ok := pathInt64(c, "versionId")
	if !ok {
		return
	}
	if err := h.versions.DeleteVersion(c.Request.Context(), tenant.ID, epID, versionID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleRevertToActive godoc
// @Summary 还原草稿到某 env 的当前激活版本（丢弃未发布修改）
// @ID revertEndpointToActive
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param env query string false "环境名"
// @Param env_id query int false "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/revert [post]
func (h *EndpointVersionHandler) HandleRevertToActive(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	envID, ok := h.resolveEnvID(c, tenant.ID)
	if !ok {
		return
	}
	if err := h.versions.RevertToActive(c.Request.Context(), tenant.ID, epID, envID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleUnpublish godoc
// @Summary 在某 env 下线接口（清掉该 env 的激活指针）
// @ID unpublishEndpoint
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param env query string false "环境名"
// @Param env_id query int false "环境ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/unpublish [post]
func (h *EndpointVersionHandler) HandleUnpublish(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	envID, ok := h.resolveEnvID(c, tenant.ID)
	if !ok {
		return
	}
	if err := h.versions.Unpublish(c.Request.Context(), tenant.ID, epID, envID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// ---- Swagger response types ----

type ScriptSnapshotResp struct {
	ID   int64  `json:"id"   validate:"required"`
	Name string `json:"name" validate:"required"`
	Type string `json:"type" validate:"required"`
	Code string `json:"code" validate:"required"`
}

// ScriptStepResp is one step in an endpoint's pre/post chain (swagger type).
type ScriptStepResp struct {
	Source   string `json:"source"               validate:"required"` // "library" | "inline"
	ScriptID int64  `json:"script_id,omitempty"`
	Name     string `json:"name,omitempty"`
	Code     string `json:"code,omitempty"`
}

type DataSourceRefResp struct {
	Alias string `json:"alias" validate:"required"`
}

type EndpointVersionResp struct {
	ID                  int64                `json:"id"                   validate:"required"`
	TenantID            int64                `json:"tenant_id"            validate:"required"`
	EndpointID          int64                `json:"endpoint_id"          validate:"required"`
	Version             int                  `json:"version"              validate:"required"`
	Snapshot            *domain.APIEndpoint  `json:"snapshot"`
	SnapshotV           int                  `json:"snapshot_v"           validate:"required"`
	PreScriptSnapshots  []ScriptSnapshotResp `json:"pre_script_snapshots,omitempty"`
	PostScriptSnapshots []ScriptSnapshotResp `json:"post_script_snapshots,omitempty"`
	DataSourceRef       *DataSourceRefResp   `json:"datasource_ref,omitempty"`
	Note                string               `json:"note"                 validate:"required"`
	CreatedBy           int64                `json:"created_by"           validate:"required"`
	CreatedAt           string               `json:"created_at"           validate:"required"`
	IsActive            bool                 `json:"is_active"            validate:"required"`
}

type EndpointVersionListResp struct {
	List       []EndpointVersionResp `json:"list"       validate:"required"`
	Pagination PaginationInfo        `json:"pagination" validate:"required"`
}

type REndpointVersion struct {
	Code int                 `json:"code" validate:"required"`
	Msg  string              `json:"msg"  validate:"required"`
	Data EndpointVersionResp `json:"data" validate:"required"`
}

type REndpointVersionList struct {
	Code int                     `json:"code" validate:"required"`
	Msg  string                  `json:"msg"  validate:"required"`
	Data EndpointVersionListResp `json:"data" validate:"required"`
}

type EndpointActivationLogResp struct {
	ID         int64  `json:"id"          validate:"required"`
	TenantID   int64  `json:"tenant_id"   validate:"required"`
	EndpointID int64  `json:"endpoint_id" validate:"required"`
	EnvID      int64  `json:"env_id,omitempty"`
	EnvName    string `json:"env_name,omitempty"`
	VersionID  int64  `json:"version_id,omitempty"`
	Version    int    `json:"version,omitempty"`
	Action     string `json:"action"      validate:"required"`
	ActorID    int64  `json:"actor_id"    validate:"required"`
	ActorName  string `json:"actor_name,omitempty"`
	At         string `json:"at"          validate:"required"`
}

type EndpointActivationLogListResp struct {
	List       []EndpointActivationLogResp `json:"list"       validate:"required"`
	Pagination PaginationInfo              `json:"pagination" validate:"required"`
}

type REndpointActivationLogList struct {
	Code int                           `json:"code" validate:"required"`
	Msg  string                        `json:"msg"  validate:"required"`
	Data EndpointActivationLogListResp `json:"data" validate:"required"`
}
