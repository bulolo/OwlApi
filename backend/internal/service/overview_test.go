package service

import (
	"context"
	"testing"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

// ── fakes ───────────────────────────────────────────────────────────────────

type fakeActivationLog struct {
	domain.EndpointActivationLogRepository
	rows []domain.RecentActivation
}

func (f *fakeActivationLog) ListRecentByTenant(_ context.Context, _ int64, _ int) ([]domain.RecentActivation, error) {
	return f.rows, nil
}

type fakeCallLogRepo struct {
	domain.EndpointCallLogRepository
	buckets   []domain.TrafficBucket
	anomalies []*domain.EndpointCallLog
}

func (f *fakeCallLogRepo) TrafficSeries(_ context.Context, _ int64, _ time.Time, _ string) ([]domain.TrafficBucket, error) {
	return f.buckets, nil
}

func (f *fakeCallLogRepo) ListRecentAnomalies(_ context.Context, _ int64, _, _ int) ([]*domain.EndpointCallLog, error) {
	return f.anomalies, nil
}

// ── activationToEvent：措辞与接口操作日志一致（publish/activate/promote = 上线）──

func TestActivationToEvent_Wording(t *testing.T) {
	cases := []struct {
		action   domain.ActivationAction
		wantDesc string
		wantSev  string
	}{
		{domain.ActivationActionPublish, "上线 v2 版本（prod）", "info"},
		{domain.ActivationActionActivate, "上线 v2 版本（prod）", "info"},
		{domain.ActivationActionPromote, "上线 v2 版本（prod）", "info"},
		{domain.ActivationActionRollback, "回滚至 v2 版本（prod）", "warning"},
		{domain.ActivationActionRevert, "还原至 v2 版本", "warning"},
		{domain.ActivationActionUnpublish, "将接口下线（prod）", "warning"},
		{domain.ActivationActionVersionCreate, "创建了 v2 版本快照", "info"},
		{domain.ActivationActionVersionDelete, "删除了 v2 版本", "warning"},
	}
	for _, c := range cases {
		a := domain.RecentActivation{Action: c.action, Version: 2, EnvName: "prod", EndpointSummary: "用户列表"}
		got := activationToEvent(a)
		if got.Desc != c.wantDesc {
			t.Errorf("%s desc = %q, want %q", c.action, got.Desc, c.wantDesc)
		}
		if got.Severity != c.wantSev {
			t.Errorf("%s severity = %q, want %q", c.action, got.Severity, c.wantSev)
		}
		if got.Type != "api" {
			t.Errorf("%s type = %q, want api", c.action, got.Type)
		}
		if got.Title != "用户列表" {
			t.Errorf("%s title = %q, want 用户列表", c.action, got.Title)
		}
	}
}

func TestActivationToEvent_ActorPrefixAndTitleFallback(t *testing.T) {
	a := domain.RecentActivation{Action: domain.ActivationActionPublish, Version: 3, EnvName: "dev", ActorName: "Admin", Method: "GET", Path: "/api/users"}
	got := activationToEvent(a)
	if got.Desc != "Admin 上线 v3 版本（dev）" {
		t.Errorf("desc = %q", got.Desc)
	}
	// 无 summary 时标题回退到 "METHOD path"
	if got.Title != "GET /api/users" {
		t.Errorf("title = %q, want GET /api/users", got.Title)
	}
}

// ── anomalyToEvent：5xx→error，慢查询→slow/warning ──────────────────────────

func TestAnomalyToEvent(t *testing.T) {
	e := anomalyToEvent(&domain.EndpointCallLog{Method: "GET", Path: "/x", Status: 500, Error: "boom", LatencyMs: 5})
	if e.Type != "error" || e.Severity != "error" || e.Desc != "返回 500：boom" {
		t.Errorf("5xx event = %+v", e)
	}
	s := anomalyToEvent(&domain.EndpointCallLog{Method: "GET", Path: "/y", Status: 200, LatencyMs: 2000})
	if s.Type != "slow" || s.Severity != "warning" {
		t.Errorf("slow event type/severity = %q/%q", s.Type, s.Severity)
	}
}

func TestEndpointTitle(t *testing.T) {
	if got := endpointTitle("摘要", "GET", "/p"); got != "摘要" {
		t.Errorf("summary case = %q", got)
	}
	if got := endpointTitle("", "GET", "/p"); got != "GET /p" {
		t.Errorf("method+path case = %q", got)
	}
	if got := endpointTitle("", "", ""); got != "(已删除接口)" {
		t.Errorf("empty case = %q", got)
	}
}

// ── RecentActivity：两源合并、按时间倒序、截断到 limit ──────────────────────

func TestRecentActivity_MergeSortLimit(t *testing.T) {
	now := time.Now()
	act := &fakeActivationLog{rows: []domain.RecentActivation{
		{Action: domain.ActivationActionPublish, Version: 1, At: now.Add(-2 * time.Minute)},
		{Action: domain.ActivationActionPublish, Version: 1, At: now.Add(-10 * time.Minute)},
	}}
	cl := &fakeCallLogRepo{anomalies: []*domain.EndpointCallLog{
		{Status: 500, Method: "GET", Path: "/x", At: now.Add(-1 * time.Minute)},
	}}
	svc := NewOverviewService(act, cl)

	got, err := svc.RecentActivity(context.Background(), 1, 2)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 { // 共 3 条，截断到 2
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].Type != "error" { // 最近的是 -1m 的异常
		t.Errorf("got[0].Type = %q, want error", got[0].Type)
	}
	if !got[0].At.After(got[1].At) {
		t.Errorf("events not sorted desc: %v then %v", got[0].At, got[1].At)
	}
}

// ── TrafficSeries：零值补齐后桶数与粒度正确 ─────────────────────────────────

func TestTrafficSeries_ZeroFillBuckets(t *testing.T) {
	svc := NewOverviewService(&fakeActivationLog{}, &fakeCallLogRepo{})
	cases := []struct {
		rng    string
		bucket string
		n      int
	}{
		{"24h", "hour", 24},
		{"7d", "day", 7},
		{"30d", "day", 30},
		{"garbage", "hour", 24}, // 非法范围回退 24h
	}
	for _, c := range cases {
		bs, bucket, err := svc.TrafficSeries(context.Background(), 1, c.rng)
		if err != nil {
			t.Fatal(err)
		}
		if bucket != c.bucket {
			t.Errorf("%s bucket = %q, want %q", c.rng, bucket, c.bucket)
		}
		if len(bs) != c.n {
			t.Errorf("%s buckets = %d, want %d", c.rng, len(bs), c.n)
		}
	}
}
