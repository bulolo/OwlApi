package http

import (
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type EndpointReleaseHandler struct {
	releases service.EndpointReleaseService
}

// HandlePublish godoc
// @Summary 发布接口版本
// @ID publishEndpoint
// @Tags release
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param body body object{note=string} false "发版说明"
// @Success 200 {object} REndpointRelease
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/releases [post]
func (h *EndpointReleaseHandler) HandlePublish(c *gin.Context) {
	tenant := GetTenant(c)
	claims := GetClaims(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	var req struct {
		Note string `json:"note"`
	}
	_ = c.ShouldBindJSON(&req)

	rel, err := h.releases.Publish(c.Request.Context(), tenant.ID, epID, claims.UserID, req.Note, tenant.MaxReleaseVersions)
	if err != nil {
		FailErr(c, err)
		return
	}
	OK(c, rel)
}

// HandleList godoc
// @Summary 查询发版记录列表
// @ID listReleases
// @Tags release
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param page query int false "页码"
// @Param size query int false "每页数量"
// @Success 200 {object} REndpointReleaseList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/releases [get]
func (h *EndpointReleaseHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	list, total, err := h.releases.ListReleases(c.Request.Context(), tenant.ID, epID, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// HandleActivate godoc
// @Summary 回滚到指定版本
// @ID activateRelease
// @Tags release
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param releaseId path int true "版本ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/releases/{releaseId}/activate [put]
func (h *EndpointReleaseHandler) HandleActivate(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	releaseID, ok := pathInt64(c, "releaseId")
	if !ok {
		return
	}
	if err := h.releases.Activate(c.Request.Context(), tenant.ID, epID, releaseID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// HandleUnpublish godoc
// @Summary 下线接口（停止对外提供服务）
// @ID unpublishEndpoint
// @Tags release
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Success 200 {object} R
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/unpublish [put]
func (h *EndpointReleaseHandler) HandleUnpublish(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	if err := h.releases.Unpublish(c.Request.Context(), tenant.ID, epID); err != nil {
		FailErr(c, err)
		return
	}
	OK(c, nil)
}

// ---- Swagger response types ----

type EndpointReleaseResp struct {
	ID          int64               `json:"id"           validate:"required"`
	TenantID    int64               `json:"tenant_id"    validate:"required"`
	EndpointID  int64               `json:"endpoint_id"  validate:"required"`
	Version     int                 `json:"version"      validate:"required"`
	Note        string              `json:"note"         validate:"required"`
	Snapshot    *domain.APIEndpoint `json:"snapshot"`
	PublishedBy int64               `json:"published_by" validate:"required"`
	PublishedAt string              `json:"published_at" validate:"required"`
	IsActive    bool                `json:"is_active"    validate:"required"`
	IsDraft     bool                `json:"is_draft"     validate:"required"`
}

type EndpointReleaseListResp struct {
	List       []EndpointReleaseResp `json:"list"       validate:"required"`
	Pagination PaginationInfo        `json:"pagination" validate:"required"`
}

type REndpointRelease struct {
	Code int                 `json:"code" validate:"required"`
	Msg  string              `json:"msg"  validate:"required"`
	Data EndpointReleaseResp `json:"data" validate:"required"`
}

type REndpointReleaseList struct {
	Code int                     `json:"code" validate:"required"`
	Msg  string                  `json:"msg"  validate:"required"`
	Data EndpointReleaseListResp `json:"data" validate:"required"`
}
