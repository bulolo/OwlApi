package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectRepo struct{ DB *DB }

var _ domain.ProjectRepository = (*ProjectRepo)(nil)

func (r *ProjectRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, slug, name, description, created_at FROM projects WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&p.ID, &p.TenantID, &p.Slug, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) GetByName(ctx context.Context, tenantID int64, name string) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, slug, name, description, created_at FROM projects WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&p.ID, &p.TenantID, &p.Slug, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) GetBySlug(ctx context.Context, tenantID int64, slug string) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, slug, name, description, created_at FROM projects WHERE tenant_id=$1 AND slug=$2`,
		tenantID, slug).Scan(&p.ID, &p.TenantID, &p.Slug, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) Create(ctx context.Context, p *domain.Project) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO projects (tenant_id, slug, name, description) VALUES ($1,$2,$3,$4) RETURNING id`,
		p.TenantID, p.Slug, p.Name, p.Description).Scan(&p.ID)
}

func (r *ProjectRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error) {
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, slug, name, description, created_at FROM projects %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.Project
	for rows.Next() {
		var proj domain.Project
		if err := rows.Scan(&proj.ID, &proj.TenantID, &proj.Slug, &proj.Name, &proj.Description, &proj.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &proj)
	}
	return list, total, rows.Err()
}

func (r *ProjectRepo) Update(ctx context.Context, p *domain.Project) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE projects SET slug=$1, name=$2, description=$3 WHERE tenant_id=$4 AND id=$5`,
		p.Slug, p.Name, p.Description, p.TenantID, p.ID)
	return err
}

func (r *ProjectRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM projects WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
