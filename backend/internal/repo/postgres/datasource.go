package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type DataSourceRepo struct{ DB *DB }

var _ domain.DataSourceRepository = (*DataSourceRepo)(nil)

func (r *DataSourceRepo) Create(ctx context.Context, ds *domain.DataSource) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO datasources (tenant_id, name, is_dual, is_platform, type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		ds.TenantID, ds.Name, ds.IsDual, ds.IsPlatform, ds.Type).Scan(&ds.ID)
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

func (r *DataSourceRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, is_dual, is_platform, type, created_at FROM datasources WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.IsPlatform, &ds.Type, &ds.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ds, r.loadEnvs(ctx, tenantID, &ds)
}

func (r *DataSourceRepo) GetByName(ctx context.Context, tenantID int64, name string) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, is_dual, is_platform, type, created_at FROM datasources WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.IsPlatform, &ds.Type, &ds.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ds, r.loadEnvs(ctx, tenantID, &ds)
}

// List fetches a page of datasources and their envs using a single
// batch query to avoid N+1 database round-trips.
func (r *DataSourceRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.DataSource, int, error) {
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR type ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM datasources `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, name, is_dual, is_platform, type, created_at FROM datasources %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.DataSource
	for rows.Next() {
		var ds domain.DataSource
		if err := rows.Scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsDual, &ds.IsPlatform, &ds.Type, &ds.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &ds)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if len(list) == 0 {
		return list, total, nil
	}

	// Batch-load all envs in one query instead of N individual calls.
	ids := make([]int64, len(list))
	for i, ds := range list {
		ids[i] = ds.ID
	}
	if err := r.loadEnvsBatch(ctx, tenantID, ids, list); err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *DataSourceRepo) Delete(ctx context.Context, tenantID, id int64) error {
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

// Update applies partial updates to a datasource.
// For each env in ds.Envs:
//   - Non-empty DSN: upserts the full row (DSN + gateway_id).
//   - Empty DSN:     updates only gateway_id for an existing env, allowing
//     callers to change the gateway binding without re-supplying credentials.
func (r *DataSourceRepo) Update(ctx context.Context, ds *domain.DataSource) error {
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
			// Gateway-only update: keep existing DSN untouched.
			if _, err := tx.Exec(ctx,
				`UPDATE datasource_envs SET gateway_id=$1 WHERE tenant_id=$2 AND datasource_id=$3 AND env=$4`,
				env.GatewayID, ds.TenantID, ds.ID, env.Env); err != nil {
				return err
			}
			continue
		}
		// Full upsert: new DSN and gateway_id.
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

// GetEnv fetches a single environment row, enforcing tenant isolation.
func (r *DataSourceRepo) GetEnv(ctx context.Context, tenantID, datasourceID int64, env string) (*domain.DataSourceEnv, error) {
	var e domain.DataSourceEnv
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, datasource_id, env, dsn, gateway_id
		 FROM datasource_envs
		 WHERE tenant_id=$1 AND datasource_id=$2 AND env=$3`,
		tenantID, datasourceID, env).Scan(&e.ID, &e.DataSourceID, &e.Env, &e.DSN, &e.GatewayID)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// loadEnvs populates ds.Envs from the database for a single datasource.
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

// loadEnvsBatch fetches envs for all datasources in a single query and assigns
// them into the list slice, avoiding N+1 queries.
func (r *DataSourceRepo) loadEnvsBatch(ctx context.Context, tenantID int64, ids []int64, list []*domain.DataSource) error {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, datasource_id, env, dsn, gateway_id
		 FROM datasource_envs
		 WHERE tenant_id=$1 AND datasource_id = ANY($2)
		 ORDER BY datasource_id, env`,
		tenantID, ids)
	if err != nil {
		return err
	}
	defer rows.Close()

	envMap := make(map[int64][]*domain.DataSourceEnv, len(ids))
	for rows.Next() {
		var e domain.DataSourceEnv
		if err := rows.Scan(&e.ID, &e.DataSourceID, &e.Env, &e.DSN, &e.GatewayID); err != nil {
			return err
		}
		envMap[e.DataSourceID] = append(envMap[e.DataSourceID], &e)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, ds := range list {
		ds.Envs = envMap[ds.ID]
	}
	return nil
}
