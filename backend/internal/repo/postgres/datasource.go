package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type DataSourceRepo struct{ DB *DB }

var _ domain.DataSourceRepository = (*DataSourceRepo)(nil)

const dsCols = `id, tenant_id, name, is_platform, type, dsn, gateway_id, created_at`

func scanDS(scan func(dest ...any) error) (*domain.DataSource, error) {
	var ds domain.DataSource
	if err := scan(&ds.ID, &ds.TenantID, &ds.Name, &ds.IsPlatform, &ds.Type, &ds.DSN, &ds.GatewayID, &ds.CreatedAt); err != nil {
		return nil, nfErr(err, "datasource")
	}
	return &ds, nil
}

func (r *DataSourceRepo) Create(ctx context.Context, ds *domain.DataSource) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO datasources (tenant_id, name, is_platform, type, dsn, gateway_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
		ds.TenantID, ds.Name, ds.IsPlatform, ds.Type, ds.DSN, ds.GatewayID,
	).Scan(&ds.ID, &ds.CreatedAt)
}

func (r *DataSourceRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+dsCols+` FROM datasources WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return scanDS(row.Scan)
}

func (r *DataSourceRepo) GetByName(ctx context.Context, tenantID int64, name string) (*domain.DataSource, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+dsCols+` FROM datasources WHERE tenant_id=$1 AND name=$2`, tenantID, name)
	return scanDS(row.Scan)
}

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
		fmt.Sprintf(`SELECT %s FROM datasources %s ORDER BY id%s`, dsCols, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.DataSource
	for rows.Next() {
		ds, err := scanDS(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, ds)
	}
	return list, total, rows.Err()
}

// ListByIDs fetches multiple datasources by id within a tenant. Order is
// unspecified — caller should re-map by ID if order matters.
func (r *DataSourceRepo) ListByIDs(ctx context.Context, tenantID int64, ids []int64) ([]*domain.DataSource, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT `+dsCols+` FROM datasources WHERE tenant_id=$1 AND id = ANY($2)`,
		tenantID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.DataSource
	for rows.Next() {
		ds, err := scanDS(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, ds)
	}
	return list, rows.Err()
}

func (r *DataSourceRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM datasources WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}

// Update applies partial updates to a datasource. An empty DSN is treated as
// "keep existing credentials" — only metadata + gateway_id are updated.
func (r *DataSourceRepo) Update(ctx context.Context, ds *domain.DataSource) error {
	if ds.DSN == "" {
		_, err := r.DB.Pool.Exec(ctx,
			`UPDATE datasources SET name=$1, type=$2, gateway_id=$3 WHERE tenant_id=$4 AND id=$5`,
			ds.Name, ds.Type, ds.GatewayID, ds.TenantID, ds.ID)
		return err
	}
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE datasources SET name=$1, type=$2, dsn=$3, gateway_id=$4 WHERE tenant_id=$5 AND id=$6`,
		ds.Name, ds.Type, ds.DSN, ds.GatewayID, ds.TenantID, ds.ID)
	return err
}
