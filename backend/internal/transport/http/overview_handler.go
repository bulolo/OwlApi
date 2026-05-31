package http

import (
	"time"

	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

type OverviewHandler struct {
	overview service.OverviewService
}

// HandleTrafficSeries godoc
// @Summary 概览流量趋势
// @Description 按时间桶聚合当前租户在选定时间范围内的接口调用量（总请求数 + 错误数），用于概览页流量趋势图。空桶补零，返回连续序列。
// @ID getOverviewTraffic
// @Tags overview
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param range query string false "时间范围：24h（默认，按小时分桶）/ 7d / 30d（按天分桶）"
// @Success 200 {object} RTrafficSeries
// @Router /v1/tenants/{slug}/overview/traffic [get]
func (h *OverviewHandler) HandleTrafficSeries(c *gin.Context) {
	tenant := GetTenant(c)
	rng := c.DefaultQuery("range", "24h")
	switch rng {
	case "24h", "7d", "30d":
	default:
		rng = "24h"
	}
	buckets, bucket, err := h.overview.TrafficSeries(c.Request.Context(), tenant.ID, rng)
	if err != nil {
		FailErr(c, err)
		return
	}
	resp := TrafficSeriesResp{Range: rng, Bucket: bucket, Buckets: make([]TrafficBucketResp, 0, len(buckets))}
	for _, b := range buckets {
		resp.Buckets = append(resp.Buckets, TrafficBucketResp{
			Ts:     b.Ts.Format(time.RFC3339),
			Total:  b.Total,
			Errors: b.Errors,
		})
		resp.Total += b.Total
		resp.Errors += b.Errors
		if b.Total > resp.Peak {
			resp.Peak = b.Total
		}
	}
	OK(c, resp)
}

type TrafficBucketResp struct {
	Ts     string `json:"ts"     validate:"required"` // 桶起始时刻（RFC3339, UTC）
	Total  int    `json:"total"  validate:"required"` // 该桶总请求数
	Errors int    `json:"errors" validate:"required"` // 该桶错误数（status >= 400）
}

type TrafficSeriesResp struct {
	Range   string              `json:"range"   validate:"required"` // 24h / 7d / 30d
	Bucket  string              `json:"bucket"  validate:"required"` // hour / day
	Buckets []TrafficBucketResp `json:"buckets" validate:"required"`
	Total   int                 `json:"total"   validate:"required"` // 区间总请求数
	Errors  int                 `json:"errors"  validate:"required"` // 区间总错误数
	Peak    int                 `json:"peak"    validate:"required"` // 单桶峰值请求数
}

type RTrafficSeries struct {
	Code int               `json:"code" validate:"required"`
	Msg  string            `json:"msg"  validate:"required"`
	Data TrafficSeriesResp `json:"data" validate:"required"`
}

// HandleRecentActivity godoc
// @Summary 概览最近动态
// @Description 合并资产变更事件（发布/激活/回滚等）与流量异常（5xx / 慢查询），按时间倒序返回当前租户的最近动态。
// @ID getOverviewActivity
// @Tags overview
// @Security BearerAuth
// @Produce json
// @Param slug path string true "租户slug"
// @Param limit query int false "返回条数上限（默认 10，最大 50）"
// @Success 200 {object} RActivityList
// @Router /v1/tenants/{slug}/overview/activity [get]
func (h *OverviewHandler) HandleRecentActivity(c *gin.Context) {
	tenant := GetTenant(c)
	limit := 10
	if raw := c.Query("limit"); raw != "" {
		if n, err := parseInt64(raw); err == nil && n > 0 {
			limit = int(n)
		}
	}
	if limit > 50 {
		limit = 50
	}
	events, err := h.overview.RecentActivity(c.Request.Context(), tenant.ID, limit)
	if err != nil {
		FailErr(c, err)
		return
	}
	out := ActivityListResp{List: make([]ActivityEventResp, 0, len(events))}
	for _, e := range events {
		out.List = append(out.List, ActivityEventResp{
			Type:     e.Type,
			Title:    e.Title,
			Desc:     e.Desc,
			Severity: e.Severity,
			At:       e.At.Format(time.RFC3339),
		})
	}
	OK(c, out)
}

type ActivityEventResp struct {
	Type     string `json:"type"     validate:"required"` // api / error / slow
	Title    string `json:"title"    validate:"required"`
	Desc     string `json:"desc"     validate:"required"`
	Severity string `json:"severity" validate:"required"` // info / warning / error
	At       string `json:"at"       validate:"required"` // RFC3339
}

type ActivityListResp struct {
	List []ActivityEventResp `json:"list" validate:"required"`
}

type RActivityList struct {
	Code int              `json:"code" validate:"required"`
	Msg  string           `json:"msg"  validate:"required"`
	Data ActivityListResp `json:"data" validate:"required"`
}
