package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type ProjectRepo struct{ DB *DB }

var _ domain.ProjectRepository = (*ProjectRepo)(nil)

// ==================== Project ====================

func (r *ProjectRepo) GetProjectByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, datasource_id, created_at FROM projects WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.DataSourceID, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) CreateProject(ctx context.Context, p *domain.Project) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO projects (tenant_id, name, description, datasource_id) VALUES ($1,$2,$3,$4) RETURNING id`,
		p.TenantID, p.Name, p.Description, p.DataSourceID).Scan(&p.ID)
}

func (r *ProjectRepo) ListProjects(ctx context.Context, tenantID int64) ([]*domain.Project, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, name, description, datasource_id, created_at FROM projects WHERE tenant_id=$1 ORDER BY id`,
		tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.DataSourceID, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	return list, nil
}

func (r *ProjectRepo) UpdateProject(ctx context.Context, p *domain.Project) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE projects SET name=$1, description=$2, datasource_id=$3 WHERE tenant_id=$4 AND id=$5`,
		p.Name, p.Description, p.DataSourceID, p.TenantID, p.ID)
	return err
}

func (r *ProjectRepo) DeleteProject(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM projects WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
