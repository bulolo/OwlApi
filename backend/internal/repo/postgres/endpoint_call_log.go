package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointCallLogRepo struct{ DB *DB }

var _ domain.EndpointCallLogRepository = (*EndpointCallLogRepo)(nil)

func (r *EndpointCallLogRepo) Append(ctx context.Context, l *domain.EndpointCallLog) error {
	marshalMap := func(m map[string]string) []byte {
		if len(m) == 0 {
			return nil
		}
		b, _ := json.Marshal(m)
		return b
	}

	var params []byte
	if l.Params != nil {
		params, _ = json.Marshal(l.Params)
	}

	var eid, vid, vnum interface{}
	if l.EnvID > 0 {
		eid = l.EnvID
	}
	if l.VersionID > 0 {
		vid = l.VersionID
	}
	if l.Version > 0 {
		vnum = l.Version
	}

	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_call_logs
			(tenant_id, endpoint_id, env_id, version_id, version, method, path,
			 params, path_params, query_params, body_params, headers,
			 status, latency_ms, error, ip, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		l.TenantID, l.EndpointID, eid, vid, vnum, l.Method, l.Path,
		params, marshalMap(l.PathParams), marshalMap(l.QueryParams), marshalMap(l.BodyParams), marshalMap(l.Headers),
		l.Status, l.LatencyMs, l.Error, l.IP, l.UserAgent)
	return err
}

func (r *EndpointCallLogRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, f domain.CallLogFilter, p domain.ListParams) ([]*domain.EndpointCallLog, int, error) {
	where := "WHERE cl.tenant_id=$1 AND cl.endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}
	argN := 3

	switch f.StatusClass {
	case "2xx":
		where += " AND cl.status >= 200 AND cl.status < 300"
	case "4xx":
		where += " AND cl.status >= 400 AND cl.status < 500"
	case "5xx":
		where += " AND cl.status >= 500 AND cl.status < 600"
	}

	if f.Keyword != "" {
		where += fmt.Sprintf(" AND (cl.path ILIKE $%d OR cl.error ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(f.Keyword))
		argN++
	}
	if !f.Since.IsZero() {
		where += fmt.Sprintf(" AND cl.at >= $%d", argN)
		args = append(args, f.Since)
		argN++
	}
	if f.EnvID > 0 {
		where += fmt.Sprintf(" AND cl.env_id = $%d", argN)
		args = append(args, f.EnvID)
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_call_logs cl `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT cl.id, cl.tenant_id, cl.endpoint_id, cl.env_id, pe.name,
		                    cl.version_id, cl.version, cl.method, cl.path, cl.params,
		                    cl.path_params, cl.query_params, cl.body_params, cl.headers,
		                    cl.status, cl.latency_ms, cl.error, cl.ip, cl.user_agent, cl.at
		 FROM endpoint_call_logs cl
		 LEFT JOIN project_environments pe ON pe.tenant_id = cl.tenant_id AND pe.id = cl.env_id
		 %s ORDER BY cl.at DESC, cl.id DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointCallLog
	for rows.Next() {
		var l domain.EndpointCallLog
		var envID *int64
		var envName *string
		var vid *int64
		var version *int
		var paramsJSON, pathJSON, queryJSON, bodyJSON, headersJSON []byte
		if err := rows.Scan(
			&l.ID, &l.TenantID, &l.EndpointID, &envID, &envName,
			&vid, &version, &l.Method, &l.Path, &paramsJSON,
			&pathJSON, &queryJSON, &bodyJSON, &headersJSON,
			&l.Status, &l.LatencyMs, &l.Error, &l.IP, &l.UserAgent, &l.At,
		); err != nil {
			return nil, 0, err
		}
		if envID != nil {
			l.EnvID = *envID
		}
		if envName != nil {
			l.EnvName = *envName
		}
		if vid != nil {
			l.VersionID = *vid
		}
		if version != nil {
			l.Version = *version
		}
		if len(paramsJSON) > 0 {
			_ = json.Unmarshal(paramsJSON, &l.Params)
		}
		if len(pathJSON) > 0 {
			_ = json.Unmarshal(pathJSON, &l.PathParams)
		}
		if len(queryJSON) > 0 {
			_ = json.Unmarshal(queryJSON, &l.QueryParams)
		}
		if len(bodyJSON) > 0 {
			_ = json.Unmarshal(bodyJSON, &l.BodyParams)
		}
		if len(headersJSON) > 0 {
			_ = json.Unmarshal(headersJSON, &l.Headers)
		}
		list = append(list, &l)
	}
	return list, total, rows.Err()
}

// TrafficSeries 按 UTC 时间桶聚合某租户 [since, now] 内的调用流水。
// 用 `at AT TIME ZONE 'UTC'` 强制按 UTC 边界分桶，与 service 层的零值补齐保持一致，
// 不受数据库会话时区影响。bucket 由 service 白名单校验（"hour" / "day"），此处作为参数绑定，无注入风险。
func (r *EndpointCallLogRepo) TrafficSeries(ctx context.Context, tenantID int64, since time.Time, bucket string) ([]domain.TrafficBucket, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT date_trunc($2, cl.at AT TIME ZONE 'UTC') AS ts,
		       COUNT(*)                                  AS total,
		       COUNT(*) FILTER (WHERE cl.status >= 400)  AS errors
		FROM endpoint_call_logs cl
		WHERE cl.tenant_id = $1 AND cl.at >= $3
		GROUP BY ts
		ORDER BY ts`, tenantID, bucket, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.TrafficBucket
	for rows.Next() {
		var b domain.TrafficBucket
		if err := rows.Scan(&b.Ts, &b.Total, &b.Errors); err != nil {
			return nil, err
		}
		b.Ts = b.Ts.UTC()
		out = append(out, b)
	}
	return out, rows.Err()
}

// ListRecentAnomalies 倒序返回某租户最近的异常调用（status >= 500 或 latency_ms > slowMs），
// 用于概览「最近动态」。只取展示所需字段，不做分页。
func (r *EndpointCallLogRepo) ListRecentAnomalies(ctx context.Context, tenantID int64, slowMs, limit int) ([]*domain.EndpointCallLog, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT id, method, path, status, latency_ms, error, at
		FROM endpoint_call_logs
		WHERE tenant_id = $1 AND (status >= 500 OR latency_ms > $2)
		ORDER BY at DESC
		LIMIT $3`, tenantID, slowMs, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.EndpointCallLog
	for rows.Next() {
		var l domain.EndpointCallLog
		if err := rows.Scan(&l.ID, &l.Method, &l.Path, &l.Status, &l.LatencyMs, &l.Error, &l.At); err != nil {
			return nil, err
		}
		out = append(out, &l)
	}
	return out, rows.Err()
}
