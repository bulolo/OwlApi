package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

// 调用日志参数序列化超过这个长度就截断，避免单行日志膨胀拖死表。
// 截断后字符串末尾会带 "...(truncated)" 标记。
const callLogParamsMaxBytes = 4 * 1024

// EndpointCallLogService 暴露调用流水的写入和查询。
//
// 设计要点：
//   - Append 是 fire-and-forget：写不动也不要让用户请求失败，所以总是返回 nil；
//     内部 goroutine 用一个独立短超时 context 写入，写不上就 slog.Warn 记一条进程日志。
//   - List 支持基础过滤（状态码段 + 关键词 + 时间下限），分页走通用 ListParams。
type EndpointCallLogService interface {
	Append(ctx context.Context, log *domain.EndpointCallLog)
	List(ctx context.Context, tenantID, endpointID int64, f domain.CallLogFilter, p domain.ListParams) ([]*domain.EndpointCallLog, int, error)
}

type endpointCallLogService struct {
	repo domain.EndpointCallLogRepository
}

func NewEndpointCallLogService(repo domain.EndpointCallLogRepository) EndpointCallLogService {
	return &endpointCallLogService{repo: repo}
}

func (s *endpointCallLogService) Append(ctx context.Context, log *domain.EndpointCallLog) {
	if log == nil {
		return
	}
	// 入参超大就截断（保留前 4KB 内容 + 提示）。整个 params map 用 JSON 序列化估长度。
	if log.Params != nil {
		if b, err := json.Marshal(log.Params); err == nil && len(b) > callLogParamsMaxBytes {
			truncated := string(b[:callLogParamsMaxBytes])
			log.Params = domain.CallLogParams{
				"__truncated_raw": truncated + "...(truncated)",
				"__original_size": len(b),
			}
		}
	}
	go func(cl *domain.EndpointCallLog) {
		// 与主请求生命周期解耦，独立 3 秒超时
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if err := s.repo.Append(ctx, cl); err != nil {
			slog.Warn("append endpoint_call_log failed",
				"endpoint_id", cl.EndpointID, "status", cl.Status, "err", err)
		}
	}(log)
}

func (s *endpointCallLogService) List(ctx context.Context, tenantID, endpointID int64, f domain.CallLogFilter, p domain.ListParams) ([]*domain.EndpointCallLog, int, error) {
	return s.repo.ListByEndpoint(ctx, tenantID, endpointID, f, p)
}
