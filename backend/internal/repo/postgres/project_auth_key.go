package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectAuthKeyRepo struct{ DB *DB }

var _ domain.ProjectAuthKeyRepository = (*ProjectAuthKeyRepo)(nil)

func (r *ProjectAuthKeyRepo) Create(ctx context.Context, key *domain.ProjectAuthKey) error {
	_, err := r.DB.Pool.Exec(ctx,
		`INSERT INTO project_auth_keys (id, tenant_id, project_id, type, name, value, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		key.ID, key.TenantID, key.ProjectID, key.Type, key.Name, key.Value, key.ExpiresAt)
	return err
}

func (r *ProjectAuthKeyRepo) Delete(ctx context.Context, tenantID, projectID int64, id string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM project_auth_keys WHERE tenant_id=$1 AND project_id=$2 AND id=$3`,
		tenantID, projectID, id)
	return err
}

func (r *ProjectAuthKeyRepo) ListByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.ProjectAuthKey, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, project_id, type, name, value, expires_at, created_at
         FROM project_auth_keys WHERE tenant_id=$1 AND project_id=$2 ORDER BY created_at`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.ProjectAuthKey
	for rows.Next() {
		var k domain.ProjectAuthKey
		if err := rows.Scan(&k.ID, &k.TenantID, &k.ProjectID, &k.Type, &k.Name, &k.Value, &k.ExpiresAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &k)
	}
	return list, rows.Err()
}

func (r *ProjectAuthKeyRepo) GetByValue(ctx context.Context, tenantID, projectID int64, value string) (*domain.ProjectAuthKey, error) {
	var k domain.ProjectAuthKey
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, type, name, value, expires_at, created_at
         FROM project_auth_keys WHERE tenant_id=$1 AND project_id=$2 AND type='api_key' AND value=$3`,
		tenantID, projectID, value).Scan(&k.ID, &k.TenantID, &k.ProjectID, &k.Type, &k.Name, &k.Value, &k.ExpiresAt, &k.CreatedAt)
	if err != nil {
		return nil, nfErr(err, "api key")
	}
	return &k, nil
}
