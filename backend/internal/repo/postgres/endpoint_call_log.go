package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointCallLogRepo struct{ DB *DB }

var _ domain.EndpointCallLogRepository = (*EndpointCallLogRepo)(nil)

func (r *EndpointCallLogRepo) Append(ctx context.Context, l *domain.EndpointCallLog) error {
	var params []byte
	if l.Params != nil {
		b, err := json.Marshal(l.Params)
		if err != nil {
			return err
		}
		params = b
	}
	var vid, vnum interface{}
	if l.VersionID > 0 {
		vid = l.VersionID
	}
	if l.Version > 0 {
		vnum = l.Version
	}
	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_call_logs
			(tenant_id, endpoint_id, version_id, version, method, path, params, status, latency_ms, error, ip, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		l.TenantID, l.EndpointID, vid, vnum, l.Method, l.Path, params, l.Status, l.LatencyMs, l.Error, l.IP, l.UserAgent)
	return err
}

func (r *EndpointCallLogRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, f domain.CallLogFilter, p domain.ListParams) ([]*domain.EndpointCallLog, int, error) {
	where := "WHERE tenant_id=$1 AND endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}
	argN := 3

	switch f.StatusClass {
	case "2xx":
		where += fmt.Sprintf(" AND status >= 200 AND status < 300")
	case "4xx":
		where += fmt.Sprintf(" AND status >= 400 AND status < 500")
	case "5xx":
		where += fmt.Sprintf(" AND status >= 500 AND status < 600")
	}

	if f.Keyword != "" {
		where += fmt.Sprintf(" AND (path ILIKE $%d OR error ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(f.Keyword))
		argN++
	}
	if !f.Since.IsZero() {
		where += fmt.Sprintf(" AND at >= $%d", argN)
		args = append(args, f.Since)
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_call_logs `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, endpoint_id, version_id, version, method, path, params, status, latency_ms, error, ip, user_agent, at
		 FROM endpoint_call_logs %s ORDER BY at DESC, id DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointCallLog
	for rows.Next() {
		var l domain.EndpointCallLog
		var vid *int64
		var version *int
		var paramsJSON []byte
		if err := rows.Scan(&l.ID, &l.TenantID, &l.EndpointID, &vid, &version, &l.Method, &l.Path, &paramsJSON, &l.Status, &l.LatencyMs, &l.Error, &l.IP, &l.UserAgent, &l.At); err != nil {
			return nil, 0, err
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
		list = append(list, &l)
	}
	return list, total, rows.Err()
}
