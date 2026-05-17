package http

import (
	"net/http"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type EndpointVersionHandler struct {
	versions service.EndpointVersionService
}

// HandlePublish godoc
// @Summary 发布接口（创建版本 + 激活，一键上线）
// @ID publishEndpoint
// @Tags endpoint-version
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
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
	var req struct {
		Note string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil && err.Error() != "EOF" {
		Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	v, err := h.versions.Publish(c.Request.Context(), tenant.ID, epID, claims.UserID, req.Note, tenant.MaxReleaseVersions)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, v)
}

// HandleCreateVersion godoc
// @Summary 创建版本快照（不激活）
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

// HandleActivate godoc
// @Summary 激活指定版本（=回滚 / 切换到此版本）
// @ID activateEndpointVersion
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param versionId path int true "版本ID"
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
	if err := h.versions.Activate(c.Request.Context(), tenant.ID, epID, versionID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleListActivationLog godoc
// @Summary 查询接口激活流水（谁、何时、做了什么）
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
// @Description 受三道护栏保护：不能删 active、不能删唯一版本、删除事件本身会写入流水
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
// @Summary 还原到线上版本（丢弃所有未发布修改）
// @Description 把 api_endpoints 草稿恢复成当前激活版本的内容；操作后 has_draft 立即变 false
// @ID revertEndpointToActive
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/revert [post]
func (h *EndpointVersionHandler) HandleRevertToActive(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	if err := h.versions.RevertToActive(c.Request.Context(), tenant.ID, epID, claims.UserID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleUnpublish godoc
// @Summary 下线接口（删除激活指针）
// @ID unpublishEndpoint
// @Tags endpoint-version
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/unpublish [post]
func (h *EndpointVersionHandler) HandleUnpublish(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	if err := h.versions.Unpublish(c.Request.Context(), tenant.ID, epID, claims.UserID); err != nil {
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

type DataSourceRefResp struct {
	ID   int64  `json:"id"   validate:"required"`
	Name string `json:"name" validate:"required"`
	Type string `json:"type" validate:"required"`
}

type EndpointVersionResp struct {
	ID                 int64               `json:"id"                   validate:"required"`
	TenantID           int64               `json:"tenant_id"            validate:"required"`
	EndpointID         int64               `json:"endpoint_id"          validate:"required"`
	Version            int                 `json:"version"              validate:"required"`
	Snapshot           *domain.APIEndpoint `json:"snapshot"`
	SnapshotV          int                 `json:"snapshot_v"           validate:"required"`
	PreScriptSnapshot  *ScriptSnapshotResp `json:"pre_script_snapshot,omitempty"`
	PostScriptSnapshot *ScriptSnapshotResp `json:"post_script_snapshot,omitempty"`
	DataSourceRef      *DataSourceRefResp  `json:"datasource_ref,omitempty"`
	Note               string              `json:"note"                 validate:"required"`
	CreatedBy          int64               `json:"created_by"           validate:"required"`
	CreatedAt          string              `json:"created_at"           validate:"required"`
	IsActive           bool                `json:"is_active"            validate:"required"`
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
	VersionID  int64  `json:"version_id,omitempty"`
	Version    int    `json:"version,omitempty"`               // 版本号 (vN)，便于直接展示
	Action     string `json:"action"      validate:"required"` // publish / activate / rollback / unpublish
	ActorID    int64  `json:"actor_id"    validate:"required"`
	ActorName  string `json:"actor_name,omitempty"` // 操作人显示名；空 = 系统
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
