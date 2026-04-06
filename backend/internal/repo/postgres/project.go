package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type ProjectRepo struct{ DB *DB }

var _ domain.ProjectRepository = (*ProjectRepo)(nil)
var _ domain.DataSourceRepository = (*ProjectRepo)(nil)
var _ domain.APIGroupRepository = (*ProjectRepo)(nil)
var _ domain.APIEndpointRepository = (*ProjectRepo)(nil)
var _ domain.ScriptRepository = (*ProjectRepo)(nil)

// ==================== Project ====================

func (r *ProjectRepo) GetProjectByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, created_at FROM projects WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) GetProjectByName(ctx context.Context, tenantID int64, name string) (*domain.Project, error) {
	var p domain.Project
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, description, created_at FROM projects WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepo) CreateProject(ctx context.Context, p *domain.Project) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO projects (tenant_id, name, description) VALUES ($1,$2,$3) RETURNING id`,
		p.TenantID, p.Name, p.Description).Scan(&p.ID)
}

func (r *ProjectRepo) ListProjects(ctx context.Context, tenantID int64) ([]*domain.Project, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, name, description, created_at FROM projects WHERE tenant_id=$1 ORDER BY id`,
		tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.Project
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ProjectRepo) UpdateProject(ctx context.Context, p *domain.Project) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE projects SET name=$1, description=$2 WHERE tenant_id=$3 AND id=$4`,
		p.Name, p.Description, p.TenantID, p.ID)
	return err
}

func (r *ProjectRepo) DeleteProject(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM projects WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}

// ==================== API Group ====================

func (r *ProjectRepo) CreateAPIGroup(ctx context.Context, g *domain.APIGroup) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_groups (tenant_id, project_id, name, description) VALUES ($1,$2,$3,$4) RETURNING id`,
		g.TenantID, g.ProjectID, g.Name, g.Description).Scan(&g.ID)
}

func (r *ProjectRepo) UpdateAPIGroup(ctx context.Context, g *domain.APIGroup) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE api_groups SET name=$1, description=$2 WHERE tenant_id=$3 AND id=$4`,
		g.Name, g.Description, g.TenantID, g.ID)
	return err
}

func (r *ProjectRepo) DeleteAPIGroup(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM api_groups WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}

func (r *ProjectRepo) ListAPIGroups(ctx context.Context, tenantID, projectID int64) ([]*domain.APIGroup, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups WHERE tenant_id=$1 AND project_id=$2 ORDER BY id`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.APIGroup
	for rows.Next() {
		var g domain.APIGroup
		if err := rows.Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &g)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ProjectRepo) GetAPIGroupByID(ctx context.Context, tenantID, id int64) (*domain.APIGroup, error) {
	var g domain.APIGroup
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *ProjectRepo) GetAPIGroupByName(ctx context.Context, tenantID, projectID int64, name string) (*domain.APIGroup, error) {
	var g domain.APIGroup
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups WHERE tenant_id=$1 AND project_id=$2 AND name=$3`,
		tenantID, projectID, name).Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}
