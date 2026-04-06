package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type DataSourceRepo struct{ DB *DB }

var _ domain.DataSourceRepository = (*DataSourceRepo)(nil)

func (r *DataSourceRepo) CreateDataSource(ctx context.Context, ds *domain.DataSource) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO datasources (tenant_id, name, is_dual, type) VALUES ($1,$2,$3,$4) RETURNING id`,
		ds.TenantID, ds.Name, ds.IsDual, ds.Type).Scan(&ds.ID)
	if err != nil {
		return err
	}
	for _, env := range ds.Envs {
		err = tx.QueryRow(ctx,
			`INSERT INTO datasource_envs (datasource_id, tenant_id, env, dsn, gateway_id) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
			ds.ID, ds.TenantID, env.Env, env.DSN, env.GatewayID).Scan(&env.ID)
		if err != nil {
			return err
		}
		env.DataSourceID = ds.ID
	}
	return tx.Commit(ctx)
}

func (r *DataSourceRepo) GetDataSourceByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, is_dual, type, created_at FROM datasources WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.Type, &ds.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ds, r.loadEnvs(ctx, tenantID, &ds)
}

func (r *DataSourceRepo) GetDataSourceByName(ctx context.Context, tenantID int64, name string) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, is_dual, type, created_at FROM datasources WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.Type, &ds.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ds, r.loadEnvs(ctx, tenantID, &ds)
}

func (r *DataSourceRepo) ListDataSources(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.DataSource, int, error) {
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR type ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM datasources `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, name, is_dual, type, created_at FROM datasources %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.DataSource
	for rows.Next() {
		var ds domain.DataSource
		if err := rows.Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.Type, &ds.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &ds)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	for _, ds := range list {
		if err := r.loadEnvs(ctx, tenantID, ds); err != nil {
			return nil, 0, err
		}
	}
	return list, total, nil
}

func (r *DataSourceRepo) DeleteDataSource(ctx context.Context, tenantID, id int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM datasource_envs WHERE tenant_id=$1 AND datasource_id=$2`, tenantID, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM datasources WHERE tenant_id=$1 AND id=$2`, tenantID, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *DataSourceRepo) UpdateDataSource(ctx context.Context, ds *domain.DataSource) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx,
		`UPDATE datasources SET name=$1, is_dual=$2, type=$3 WHERE tenant_id=$4 AND id=$5`,
		ds.Name, ds.IsDual, ds.Type, ds.TenantID, ds.ID); err != nil {
		return err
	}
	for _, env := range ds.Envs {
		if env.DSN == "" {
			continue
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO datasource_envs (datasource_id, tenant_id, env, dsn, gateway_id)
			 VALUES ($1,$2,$3,$4,$5)
			 ON CONFLICT (tenant_id, datasource_id, env) DO UPDATE SET dsn=$4, gateway_id=$5`,
			ds.ID, ds.TenantID, env.Env, env.DSN, env.GatewayID); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *DataSourceRepo) GetDataSourceEnv(ctx context.Context, datasourceID int64, env string) (*domain.DataSourceEnv, error) {
	var e domain.DataSourceEnv
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, datasource_id, env, dsn, gateway_id FROM datasource_envs WHERE datasource_id=$1 AND env=$2`,
		datasourceID, env).Scan(&e.ID, &e.DataSourceID, &e.Env, &e.DSN, &e.GatewayID)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *DataSourceRepo) loadEnvs(ctx context.Context, tenantID int64, ds *domain.DataSource) error {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, datasource_id, env, dsn, gateway_id FROM datasource_envs WHERE tenant_id=$1 AND datasource_id=$2 ORDER BY env`,
		tenantID, ds.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var e domain.DataSourceEnv
		if err := rows.Scan(&e.ID, &e.DataSourceID, &e.Env, &e.DSN, &e.GatewayID); err != nil {
			return err
		}
		ds.Envs = append(ds.Envs, &e)
	}
	return rows.Err()
}
