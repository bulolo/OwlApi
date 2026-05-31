package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

// 慢查询阈值：单次调用 latency 超过该毫秒数即计入「最近动态」的慢查询事件。
const slowQueryThresholdMs = 1000

// OverviewService 聚合概览页的「最近动态」：把资产变更事件（发布/激活/回滚…）
// 与流量异常（5xx / 慢查询）合并成一条按时间倒序的统一事件流。
type OverviewService interface {
	// TrafficSeries 返回流量趋势：按 rng（"24h" / "7d" / "30d"）聚合的连续时间桶（零值已补齐）+ 桶粒度（"hour" / "day"）。
	TrafficSeries(ctx context.Context, tenantID int64, rng string) ([]domain.TrafficBucket, string, error)
	// RecentActivity 返回最近动态：合并资产变更事件与流量异常，按时间倒序。
	RecentActivity(ctx context.Context, tenantID int64, limit int) ([]domain.ActivityEvent, error)
}

type overviewService struct {
	activations domain.EndpointActivationLogRepository
	callLogs    domain.EndpointCallLogRepository
}

func NewOverviewService(activations domain.EndpointActivationLogRepository, callLogs domain.EndpointCallLogRepository) OverviewService {
	return &overviewService{activations: activations, callLogs: callLogs}
}

func (s *overviewService) TrafficSeries(ctx context.Context, tenantID int64, rng string) ([]domain.TrafficBucket, string, error) {
	now := time.Now().UTC()
	var (
		bucket string
		start  time.Time
		step   func(time.Time) time.Time
	)
	switch rng {
	case "7d":
		bucket = "day"
		start = now.Truncate(24*time.Hour).AddDate(0, 0, -6) // 含今天共 7 天
		step = func(t time.Time) time.Time { return t.AddDate(0, 0, 1) }
	case "30d":
		bucket = "day"
		start = now.Truncate(24*time.Hour).AddDate(0, 0, -29) // 含今天共 30 天
		step = func(t time.Time) time.Time { return t.AddDate(0, 0, 1) }
	default: // "24h"
		bucket = "hour"
		start = now.Truncate(time.Hour).Add(-23 * time.Hour) // 含当前小时共 24 桶
		step = func(t time.Time) time.Time { return t.Add(time.Hour) }
	}

	raw, err := s.callLogs.TrafficSeries(ctx, tenantID, start, bucket)
	if err != nil {
		return nil, "", err
	}
	// 按桶起点索引已有数据，再从 start 步进到 now 逐桶补齐，保证返回连续无空洞。
	got := make(map[int64]domain.TrafficBucket, len(raw))
	for _, b := range raw {
		got[b.Ts.Unix()] = b
	}
	var out []domain.TrafficBucket
	for t := start; !t.After(now); t = step(t) {
		b := domain.TrafficBucket{Ts: t}
		if hit, ok := got[t.Unix()]; ok {
			b.Total, b.Errors = hit.Total, hit.Errors
		}
		out = append(out, b)
	}
	return out, bucket, nil
}

func (s *overviewService) RecentActivity(ctx context.Context, tenantID int64, limit int) ([]domain.ActivityEvent, error) {
	if limit <= 0 {
		limit = 10
	}
	// 两个来源各取最多 limit 条，合并排序后再截断，保证无论哪一类更新更密都能正确呈现最近 limit 条。
	activations, err := s.activations.ListRecentByTenant(ctx, tenantID, limit)
	if err != nil {
		return nil, err
	}
	anomalies, err := s.callLogs.ListRecentAnomalies(ctx, tenantID, slowQueryThresholdMs, limit)
	if err != nil {
		return nil, err
	}

	events := make([]domain.ActivityEvent, 0, len(activations)+len(anomalies))
	for _, a := range activations {
		events = append(events, activationToEvent(a))
	}
	for _, c := range anomalies {
		events = append(events, anomalyToEvent(c))
	}

	sort.Slice(events, func(i, j int) bool { return events[i].At.After(events[j].At) })
	if len(events) > limit {
		events = events[:limit]
	}
	return events, nil
}

// endpointTitle 取端点摘要，没有摘要时回退到 "METHOD /path"。
func endpointTitle(summary, method, path string) string {
	if summary != "" {
		return summary
	}
	if method != "" && path != "" {
		return method + " " + path
	}
	if path != "" {
		return path
	}
	return "(已删除接口)"
}

func activationToEvent(a domain.RecentActivation) domain.ActivityEvent {
	ver := ""
	if a.Version > 0 {
		ver = fmt.Sprintf("v%d", a.Version)
	}
	env := a.EnvName
	if env != "" {
		env = "（" + env + "）"
	}

	// 措辞与接口操作日志（ActivationLog.tsx）保持一致：publish/activate/promote 统一叫「上线」。
	desc := ""
	severity := "info"
	switch a.Action {
	case domain.ActivationActionVersionCreate:
		desc = fmt.Sprintf("创建了 %s 版本快照", ver)
	case domain.ActivationActionPublish, domain.ActivationActionActivate, domain.ActivationActionPromote:
		desc = fmt.Sprintf("上线 %s 版本%s", ver, env)
	case domain.ActivationActionRollback:
		desc, severity = fmt.Sprintf("回滚至 %s 版本%s", ver, env), "warning"
	case domain.ActivationActionRevert:
		desc, severity = fmt.Sprintf("还原至 %s 版本", ver), "warning"
	case domain.ActivationActionUnpublish:
		desc, severity = fmt.Sprintf("将接口下线%s", env), "warning"
	case domain.ActivationActionVersionDelete:
		desc, severity = fmt.Sprintf("删除了 %s 版本", ver), "warning"
	default:
		desc = string(a.Action)
	}
	if a.ActorName != "" {
		desc = a.ActorName + " " + desc
	}
	return domain.ActivityEvent{
		Type:     "api",
		Title:    endpointTitle(a.EndpointSummary, a.Method, a.Path),
		Desc:     strings.TrimSpace(desc),
		Severity: severity,
		At:       a.At,
	}
}

func anomalyToEvent(c *domain.EndpointCallLog) domain.ActivityEvent {
	title := endpointTitle("", c.Method, c.Path)
	// 5xx 优先归类为错误；否则就是触发阈值的慢查询。
	if c.Status >= 500 {
		desc := fmt.Sprintf("返回 %d", c.Status)
		if c.Error != "" {
			desc += "：" + truncate(c.Error, 60)
		}
		return domain.ActivityEvent{Type: "error", Title: title, Desc: desc, Severity: "error", At: c.At}
	}
	return domain.ActivityEvent{
		Type:     "slow",
		Title:    title,
		Desc:     fmt.Sprintf("慢查询 %dms（status %d）", c.LatencyMs, c.Status),
		Severity: "warning",
		At:       c.At,
	}
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}
