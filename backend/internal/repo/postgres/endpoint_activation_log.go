package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointActivationLogRepo struct{ DB *DB }

var _ domain.EndpointActivationLogRepository = (*EndpointActivationLogRepo)(nil)

func (r *EndpointActivationLogRepo) Append(ctx context.Context, tenantID, endpointID, envID, versionID int64, versionNumber int, actorID int64, action domain.ActivationAction) error {
	var eid, vid, vnum interface{}
	if envID > 0 {
		eid = envID
	}
	if versionID > 0 {
		vid = versionID
	}
	if versionNumber > 0 {
		vnum = versionNumber
	}
	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_activation_log (tenant_id, endpoint_id, env_id, version_id, version, action, actor_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		tenantID, endpointID, eid, vid, vnum, string(action), actorID)
	return err
}

// ListRecentByTenant 倒序拉取某租户最近 limit 条资产变更事件（跨端点），
// 用 LEFT JOIN 补出端点摘要/路径/方法、环境名、操作人名（目标被删后仍能展示历史）。
func (r *EndpointActivationLogRepo) ListRecentByTenant(ctx context.Context, tenantID int64, limit int) ([]domain.RecentActivation, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT l.action,
		       COALESCE(ep.summary, ''), COALESCE(ep.path, ''), COALESCE(ep.method, ''),
		       COALESCE(pe.name, ''), COALESCE(l.version, ev.version, 0),
		       COALESCE(u.name, ''), l.at
		FROM endpoint_activation_log l
		LEFT JOIN api_endpoints ep        ON ep.tenant_id = l.tenant_id AND ep.id = l.endpoint_id
		LEFT JOIN endpoint_versions ev    ON ev.tenant_id = l.tenant_id AND ev.id = l.version_id
		LEFT JOIN users u                 ON u.id = l.actor_id
		LEFT JOIN project_environments pe ON pe.tenant_id = l.tenant_id AND pe.id = l.env_id
		WHERE l.tenant_id = $1
		ORDER BY l.at DESC
		LIMIT $2`, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.RecentActivation
	for rows.Next() {
		var a domain.RecentActivation
		var action string
		if err := rows.Scan(&action, &a.EndpointSummary, &a.Path, &a.Method, &a.EnvName, &a.Version, &a.ActorName, &a.At); err != nil {
			return nil, err
		}
		a.Action = domain.ActivationAction(action)
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *EndpointActivationLogRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointActivationLog, int, error) {
	where := "WHERE l.tenant_id=$1 AND l.endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_activation_log l `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, 3, args)
	// LEFT JOIN endpoint_versions / users / project_environments to enrich the row
	// without losing entries whose target was later deleted.
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT l.id, l.tenant_id, l.endpoint_id, l.env_id, pe.name,
		                    l.version_id, COALESCE(l.version, ev.version), l.action,
		                    l.actor_id, u.name, l.at
		 FROM endpoint_activation_log l
		 LEFT JOIN endpoint_versions ev    ON ev.tenant_id = l.tenant_id AND ev.id = l.version_id
		 LEFT JOIN users u                 ON u.id = l.actor_id
		 LEFT JOIN project_environments pe ON pe.tenant_id = l.tenant_id AND pe.id = l.env_id
		 %s ORDER BY l.at DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointActivationLog
	for rows.Next() {
		var l domain.EndpointActivationLog
		var envID *int64
		var envName *string
		var vid *int64
		var version *int
		var action string
		var actorName *string
		if err := rows.Scan(&l.ID, &l.TenantID, &l.EndpointID, &envID, &envName, &vid, &version, &action, &l.ActorID, &actorName, &l.At); err != nil {
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
		if actorName != nil {
			l.ActorName = *actorName
		}
		l.Action = domain.ActivationAction(action)
		list = append(list, &l)
	}
	return list, total, rows.Err()
}
