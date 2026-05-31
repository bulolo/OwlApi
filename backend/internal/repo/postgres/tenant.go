package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

type TenantRepo struct{ DB *DB }

var _ domain.TenantRepository = (*TenantRepo)(nil)

func (r *TenantRepo) Create(ctx context.Context, t *domain.Tenant) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO tenants (name, slug, status, max_release_versions, avatar, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		t.Name, t.Slug, t.Status, t.MaxReleaseVersions, t.Avatar, t.CreatedAt, t.UpdatedAt).Scan(&t.ID)
}

const tenantCols = `id, name, slug, status, max_release_versions, avatar, created_at, updated_at`

func scanTenant(t *domain.Tenant, scan func(dest ...any) error) error {
	return nfErr(scan(&t.ID, &t.Name, &t.Slug, &t.Status, &t.MaxReleaseVersions, &t.Avatar, &t.CreatedAt, &t.UpdatedAt), "tenant")
}

func (r *TenantRepo) GetByID(ctx context.Context, id int64) (*domain.Tenant, error) {
	var t domain.Tenant
	err := scanTenant(&t, r.DB.Pool.QueryRow(ctx,
		`SELECT `+tenantCols+` FROM tenants WHERE id=$1`, id).Scan)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := scanTenant(&t, r.DB.Pool.QueryRow(ctx,
		`SELECT `+tenantCols+` FROM tenants WHERE slug=$1`, slug).Scan)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TenantRepo) List(ctx context.Context, p domain.ListParams) ([]*domain.Tenant, int, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	argN := 1
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR slug ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT `+tenantCols+` FROM tenants %s ORDER BY id ASC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Status, &t.MaxReleaseVersions, &t.Avatar, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, err
		}
		tenants = append(tenants, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return tenants, total, nil
}

func (r *TenantRepo) ListByIDs(ctx context.Context, ids []int64, p domain.ListParams) ([]*domain.Tenant, int, error) {
	if len(ids) == 0 {
		return nil, 0, nil
	}
	where := "WHERE id = ANY($1)"
	args := []interface{}{ids}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR slug ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT `+tenantCols+` FROM tenants %s ORDER BY id ASC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Status, &t.MaxReleaseVersions, &t.Avatar, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, err
		}
		tenants = append(tenants, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return tenants, total, nil
}

func (r *TenantRepo) Update(ctx context.Context, t *domain.Tenant) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE tenants SET name=$1, status=$2, max_release_versions=$3, avatar=$4, updated_at=$5 WHERE id=$6`,
		t.Name, t.Status, t.MaxReleaseVersions, t.Avatar, time.Now(), t.ID)
	return err
}

// Delete removes the tenant and all tenant-scoped data in one transaction.
// 无外键，全部在应用层显式清理；平台级数据（tenant_id 为 NULL 的网关/脚本、
// 全局 users / platform_settings）不受影响。
func (r *TenantRepo) Delete(ctx context.Context, id int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // no-op once committed

	// 所有带 tenant_id 的表（tenant_id 为 NULL 的平台级行不会被匹配）。
	for _, tbl := range []string{
		"endpoint_call_logs",
		"endpoint_activation_log",
		"endpoint_active_version",
		"endpoint_versions",
		"endpoint_datasource_bindings",
		"api_endpoints",
		"api_groups",
		"project_environments",
		"project_auth_keys",
		"openapi_share_tokens",
		"datasources",
		"scripts",
		"projects",
		"gateways",
		"tenant_users",
	} {
		if _, err := tx.Exec(ctx, `DELETE FROM `+tbl+` WHERE tenant_id=$1`, id); err != nil {
			return err
		}
	}

	// 扩展模块注册的租户级清理钩子（核心无注册时为空）。
	for _, fn := range tenantDeleteCleanups {
		if err := fn(ctx, tx, id); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM tenants WHERE id=$1`, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
