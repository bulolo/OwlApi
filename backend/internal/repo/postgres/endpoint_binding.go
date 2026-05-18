package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointDatasourceBindingRepo struct{ DB *DB }

var _ domain.EndpointDatasourceBindingRepository = (*EndpointDatasourceBindingRepo)(nil)

const bindingCols = `tenant_id, env_id, alias, datasource_id`

func scanBinding(scan func(dest ...any) error) (*domain.EndpointDatasourceBinding, error) {
	var b domain.EndpointDatasourceBinding
	if err := scan(&b.TenantID, &b.EnvID, &b.Alias, &b.DataSourceID); err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *EndpointDatasourceBindingRepo) Upsert(ctx context.Context, b *domain.EndpointDatasourceBinding) error {
	_, err := r.DB.Pool.Exec(ctx,
		`INSERT INTO endpoint_datasource_bindings (tenant_id, env_id, alias, datasource_id)
		 VALUES ($1,$2,$3,$4)
		 ON CONFLICT (tenant_id, env_id, alias) DO UPDATE SET datasource_id=$4`,
		b.TenantID, b.EnvID, b.Alias, b.DataSourceID)
	return err
}

func (r *EndpointDatasourceBindingRepo) Delete(ctx context.Context, tenantID, envID int64, alias string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_datasource_bindings WHERE tenant_id=$1 AND env_id=$2 AND alias=$3`,
		tenantID, envID, alias)
	return err
}

func (r *EndpointDatasourceBindingRepo) Get(ctx context.Context, tenantID, envID int64, alias string) (*domain.EndpointDatasourceBinding, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+bindingCols+` FROM endpoint_datasource_bindings WHERE tenant_id=$1 AND env_id=$2 AND alias=$3`,
		tenantID, envID, alias)
	return scanBinding(row.Scan)
}

func (r *EndpointDatasourceBindingRepo) ListByEnv(ctx context.Context, tenantID, envID int64) ([]*domain.EndpointDatasourceBinding, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT `+bindingCols+` FROM endpoint_datasource_bindings WHERE tenant_id=$1 AND env_id=$2 ORDER BY alias`,
		tenantID, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.EndpointDatasourceBinding
	for rows.Next() {
		b, err := scanBinding(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, rows.Err()
}

func (r *EndpointDatasourceBindingRepo) ListByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.EndpointDatasourceBinding, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT b.tenant_id, b.env_id, b.alias, b.datasource_id
		 FROM endpoint_datasource_bindings b
		 JOIN project_environments e ON e.tenant_id = b.tenant_id AND e.id = b.env_id
		 WHERE b.tenant_id=$1 AND e.project_id=$2
		 ORDER BY b.env_id, b.alias`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.EndpointDatasourceBinding
	for rows.Next() {
		b, err := scanBinding(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	return list, rows.Err()
}

func (r *EndpointDatasourceBindingRepo) DeleteByEnv(ctx context.Context, tenantID, envID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_datasource_bindings WHERE tenant_id=$1 AND env_id=$2`,
		tenantID, envID)
	return err
}

// RenameAlias updates every env's binding for the project so alias name changes
// propagate atomically across the project's envs.
func (r *EndpointDatasourceBindingRepo) RenameAlias(ctx context.Context, tenantID, projectID int64, oldAlias, newAlias string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE endpoint_datasource_bindings b
		   SET alias=$4
		 WHERE b.tenant_id=$1
		   AND b.alias=$3
		   AND b.env_id IN (SELECT id FROM project_environments WHERE tenant_id=$1 AND project_id=$2)`,
		tenantID, projectID, oldAlias, newAlias)
	return err
}
