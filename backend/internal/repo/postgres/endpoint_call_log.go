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
			(tenant_id, endpoint_id, env_id, version_id, version, method, path, params, status, latency_ms, error, ip, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		l.TenantID, l.EndpointID, eid, vid, vnum, l.Method, l.Path, params, l.Status, l.LatencyMs, l.Error, l.IP, l.UserAgent)
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
		var paramsJSON []byte
		if err := rows.Scan(&l.ID, &l.TenantID, &l.EndpointID, &envID, &envName, &vid, &version, &l.Method, &l.Path, &paramsJSON, &l.Status, &l.LatencyMs, &l.Error, &l.IP, &l.UserAgent, &l.At); err != nil {
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
		list = append(list, &l)
	}
	return list, total, rows.Err()
}
