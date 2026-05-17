package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointActivationLogRepo struct{ DB *DB }

var _ domain.EndpointActivationLogRepository = (*EndpointActivationLogRepo)(nil)

func (r *EndpointActivationLogRepo) Append(ctx context.Context, tenantID, endpointID, versionID int64, versionNumber int, actorID int64, action domain.ActivationAction) error {
	var vid, vnum interface{}
	if versionID > 0 {
		vid = versionID
	}
	if versionNumber > 0 {
		vnum = versionNumber
	}
	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_activation_log (tenant_id, endpoint_id, version_id, version, action, actor_id)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		tenantID, endpointID, vid, vnum, string(action), actorID)
	return err
}

func (r *EndpointActivationLogRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointActivationLog, int, error) {
	where := "WHERE l.tenant_id=$1 AND l.endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_activation_log l `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, 3, args)
	// LEFT JOIN endpoint_versions → 取最新版本号；LEFT JOIN users → 取操作人名字（含超管）。
	// 版本号优先取冗余的 l.version；若为旧数据（NULL）则回退到 JOIN 出来的 ev.version。
	// 版本被删后 ev 这条 JOIN 失败，l.version 仍然保留写入时的 vN。
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT l.id, l.tenant_id, l.endpoint_id, l.version_id, COALESCE(l.version, ev.version), l.action, l.actor_id, u.name, l.at
		 FROM endpoint_activation_log l
		 LEFT JOIN endpoint_versions ev ON ev.tenant_id = l.tenant_id AND ev.id = l.version_id
		 LEFT JOIN users u              ON u.id = l.actor_id
		 %s ORDER BY l.at DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointActivationLog
	for rows.Next() {
		var l domain.EndpointActivationLog
		var vid *int64
		var version *int
		var action string
		var actorName *string
		if err := rows.Scan(&l.ID, &l.TenantID, &l.EndpointID, &vid, &version, &action, &l.ActorID, &actorName, &l.At); err != nil {
			return nil, 0, err
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
