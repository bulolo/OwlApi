package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointActiveVersionRepo struct{ DB *DB }

var _ domain.EndpointActiveVersionRepository = (*EndpointActiveVersionRepo)(nil)

const eavCols = `eav.tenant_id, eav.endpoint_id, eav.env_id, eav.version_id, ev.version, eav.activated_by, eav.activated_at`

func scanEAV(scan func(dest ...any) error) (*domain.EndpointActiveVersion, error) {
	var av domain.EndpointActiveVersion
	if err := scan(&av.TenantID, &av.EndpointID, &av.EnvID, &av.VersionID, &av.Version, &av.ActivatedBy, &av.ActivatedAt); err != nil {
		return nil, err
	}
	return &av, nil
}

func (r *EndpointActiveVersionRepo) Upsert(ctx context.Context, tenantID, endpointID, envID, versionID, actorID int64) error {
	_, err := r.DB.Pool.Exec(ctx, `
		INSERT INTO endpoint_active_version (tenant_id, endpoint_id, env_id, version_id, activated_by, activated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (tenant_id, endpoint_id, env_id) DO UPDATE
		   SET version_id   = EXCLUDED.version_id,
		       activated_by = EXCLUDED.activated_by,
		       activated_at = EXCLUDED.activated_at`,
		tenantID, endpointID, envID, versionID, actorID)
	return err
}

func (r *EndpointActiveVersionRepo) Get(ctx context.Context, tenantID, endpointID, envID int64) (*domain.EndpointActiveVersion, error) {
	row := r.DB.Pool.QueryRow(ctx, `
		SELECT `+eavCols+`
		FROM endpoint_active_version eav
		JOIN endpoint_versions ev ON ev.tenant_id = eav.tenant_id AND ev.id = eav.version_id
		WHERE eav.tenant_id=$1 AND eav.endpoint_id=$2 AND eav.env_id=$3`,
		tenantID, endpointID, envID)
	return scanEAV(row.Scan)
}

func (r *EndpointActiveVersionRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64) ([]*domain.EndpointActiveVersion, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT `+eavCols+`
		FROM endpoint_active_version eav
		JOIN endpoint_versions ev ON ev.tenant_id = eav.tenant_id AND ev.id = eav.version_id
		WHERE eav.tenant_id=$1 AND eav.endpoint_id=$2`,
		tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.EndpointActiveVersion
	for rows.Next() {
		av, err := scanEAV(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, av)
	}
	return list, rows.Err()
}

func (r *EndpointActiveVersionRepo) Delete(ctx context.Context, tenantID, endpointID, envID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_active_version WHERE tenant_id=$1 AND endpoint_id=$2 AND env_id=$3`,
		tenantID, endpointID, envID)
	return err
}

func (r *EndpointActiveVersionRepo) DeleteByEndpoint(ctx context.Context, tenantID, endpointID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_active_version WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID)
	return err
}

func (r *EndpointActiveVersionRepo) DeleteByEnv(ctx context.Context, tenantID, envID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_active_version WHERE tenant_id=$1 AND env_id=$2`,
		tenantID, envID)
	return err
}

func (r *EndpointActiveVersionRepo) ListByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.EndpointActiveVersion, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT `+eavCols+`
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
		av, err := scanEAV(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, av)
	}
	return list, rows.Err()
}

func (r *EndpointActiveVersionRepo) ListByProjectAndEnv(ctx context.Context, tenantID, projectID, envID int64) ([]*domain.EndpointActiveVersion, error) {
	rows, err := r.DB.Pool.Query(ctx, `
		SELECT `+eavCols+`
		FROM endpoint_active_version eav
		JOIN endpoint_versions ev ON ev.tenant_id = eav.tenant_id AND ev.id = eav.version_id
		JOIN api_endpoints ae    ON ae.tenant_id  = eav.tenant_id AND ae.id  = eav.endpoint_id
		WHERE eav.tenant_id=$1 AND ae.project_id=$2 AND eav.env_id=$3`,
		tenantID, projectID, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.EndpointActiveVersion
	for rows.Next() {
		av, err := scanEAV(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, av)
	}
	return list, rows.Err()
}
