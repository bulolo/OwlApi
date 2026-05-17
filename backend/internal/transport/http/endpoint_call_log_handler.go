package http

import (
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type EndpointCallLogHandler struct {
	callLogs service.EndpointCallLogService
}

// HandleList godoc
// @Summary 查询接口调用日志
// @Description 倒序列出指定接口最近的调用流水（成功+失败）。支持按状态码段、关键词、时间下限过滤
// @ID listEndpointCallLogs
// @Tags endpoint-call-log
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param projectId path int true "项目ID"
// @Param endpointId path int true "端点ID"
// @Param page query int false "页码"
// @Param size query int false "每页数量"
// @Param status query string false "状态码段：all / 2xx / 4xx / 5xx"
// @Param keyword query string false "关键词搜索（匹配 path 或 error）"
// @Param since query string false "时间下限 (RFC3339)，仅返回该时间之后的"
// @Success 200 {object} REndpointCallLogList
// @Router /v1/tenants/{slug}/projects/{projectId}/endpoints/{endpointId}/call-logs [get]
func (h *EndpointCallLogHandler) HandleList(c *gin.Context) {
	tenant := GetTenant(c)
	epID, ok := pathInt64(c, "endpointId")
	if !ok {
		return
	}
	lp := parseListParams(c)
	filter := domain.CallLogFilter{
		StatusClass: c.DefaultQuery("status", ""),
		Keyword:     c.DefaultQuery("keyword", ""),
	}
	if since := c.Query("since"); since != "" {
		if t, err := time.Parse(time.RFC3339, since); err == nil {
			filter.Since = t
		}
	}
	list, total, err := h.callLogs.List(c.Request.Context(), tenant.ID, epID, filter, lp)
	if err != nil {
		FailErr(c, err)
		return
	}
	OKPaged(c, list, lp, total)
}

// ---- Swagger response types ----

type EndpointCallLogResp struct {
	ID         int64                  `json:"id"          validate:"required"`
	TenantID   int64                  `json:"tenant_id"   validate:"required"`
	EndpointID int64                  `json:"endpoint_id" validate:"required"`
	VersionID  int64                  `json:"version_id,omitempty"`
	Version    int                    `json:"version,omitempty"`
	Method     string                 `json:"method"      validate:"required"`
	Path       string                 `json:"path"        validate:"required"`
	Params     map[string]interface{} `json:"params,omitempty"`
	Status     int                    `json:"status"      validate:"required"`
	LatencyMs  int                    `json:"latency_ms"  validate:"required"`
	Error      string                 `json:"error,omitempty"`
	IP         string                 `json:"ip,omitempty"`
	UserAgent  string                 `json:"user_agent,omitempty"`
	At         string                 `json:"at"          validate:"required"`
}

type EndpointCallLogListResp struct {
	List       []EndpointCallLogResp `json:"list"       validate:"required"`
	Pagination PaginationInfo        `json:"pagination" validate:"required"`
}

type REndpointCallLogList struct {
	Code int                     `json:"code" validate:"required"`
	Msg  string                  `json:"msg"  validate:"required"`
	Data EndpointCallLogListResp `json:"data" validate:"required"`
}
