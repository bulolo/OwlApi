package postgres

import (
	"context"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type TenantRepo struct{ DB *DB }

var _ domain.TenantRepository = (*TenantRepo)(nil)

func (r *TenantRepo) Create(ctx context.Context, t *domain.Tenant) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO tenants (name, slug, plan, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		t.Name, t.Slug, t.Plan, t.Status, t.CreatedAt, t.UpdatedAt).Scan(&t.ID)
}

func (r *TenantRepo) GetByID(ctx context.Context, id int64) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants WHERE id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants WHERE slug=$1`, slug).
		Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TenantRepo) List(ctx context.Context, page, size int) ([]*domain.Tenant, int, error) {
	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants`).Scan(&total); err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * size
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		size, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
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
		`UPDATE tenants SET name=$1, plan=$2, status=$3, updated_at=$4 WHERE id=$5`,
		t.Name, t.Plan, t.Status, time.Now(), t.ID)
	return err
}

func (r *TenantRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM tenants WHERE id=$1`, id)
	return err
}
