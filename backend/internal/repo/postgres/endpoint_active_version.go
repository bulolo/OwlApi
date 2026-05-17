package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointActiveVersionRepo struct{ DB *DB }

var _ domain.EndpointActiveVersionRepository = (*EndpointActiveVersionRepo)(nil)

func (r *EndpointActiveVersionRepo) Upsert(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error {
	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_active_version (tenant_id, endpoint_id, version_id, activated_by, activated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (tenant_id, endpoint_id) DO UPDATE
		   SET version_id   = EXCLUDED.version_id,
		       activated_by = EXCLUDED.activated_by,
		       activated_at = EXCLUDED.activated_at`,
		tenantID, endpointID, versionID, actorID)
	return err
}

func (r *EndpointActiveVersionRepo) Get(ctx context.Context, tenantID, endpointID int64) (*domain.EndpointActiveVersion, error) {
	var av domain.EndpointActiveVersion
	err := r.DB.Pool.QueryRow(ctx, `
		SELECT eav.tenant_id, eav.endpoint_id, eav.version_id, ev.version, eav.activated_by, eav.activated_at
		FROM endpoint_active_version eav
		JOIN endpoint_versions ev ON ev.tenant_id = eav.tenant_id AND ev.id = eav.version_id
		WHERE eav.tenant_id=$1 AND eav.endpoint_id=$2`,
		tenantID, endpointID,
	).Scan(&av.TenantID, &av.EndpointID, &av.VersionID, &av.Version, &av.ActivatedBy, &av.ActivatedAt)
	if err != nil {
		return nil, err
	}
	return &av, nil
}

func (r *EndpointActiveVersionRepo) Delete(ctx context.Context, tenantID, endpointID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_active_version WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID)
	return err
}

func (r *EndpointActiveVersionRepo) ListByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.EndpointActiveVersion, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT eav.tenant_id, eav.endpoint_id, eav.version_id, ev.version, eav.activated_by, eav.activated_at
		FROM endpoint_active_version eav
		JOIN endpoint_versions ev ON ev.tenant_id = eav.tenant_id AND ev.id = eav.version_id
		JOIN api_endpoints ae    ON ae.tenant_id  = eav.tenant_id AND ae.id  = eav.endpoint_id
		WHERE eav.tenant_id=$1 AND ae.project_id=$2`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.EndpointActiveVersion
	for rows.Next() {
		var av domain.EndpointActiveVersion
		if err := rows.Scan(&av.TenantID, &av.EndpointID, &av.VersionID, &av.Version, &av.ActivatedBy, &av.ActivatedAt); err != nil {
			return nil, err
		}
		list = append(list, &av)
	}
	return list, rows.Err()
}
