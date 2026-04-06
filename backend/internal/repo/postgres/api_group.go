package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type APIGroupRepo struct{ DB *DB }

var _ domain.APIGroupRepository = (*APIGroupRepo)(nil)

func (r *APIGroupRepo) CreateAPIGroup(ctx context.Context, g *domain.APIGroup) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_groups (tenant_id, project_id, name, description) VALUES ($1,$2,$3,$4) RETURNING id`,
		g.TenantID, g.ProjectID, g.Name, g.Description).Scan(&g.ID)
}

func (r *APIGroupRepo) UpdateAPIGroup(ctx context.Context, g *domain.APIGroup) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE api_groups SET name=$1, description=$2 WHERE tenant_id=$3 AND id=$4`,
		g.Name, g.Description, g.TenantID, g.ID)
	return err
}

func (r *APIGroupRepo) DeleteAPIGroup(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM api_groups WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}

func (r *APIGroupRepo) ListAPIGroups(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIGroup, int, error) {
	where := "WHERE tenant_id=$1 AND project_id=$2"
	args := []interface{}{tenantID, projectID}
	argN := 3
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND name ILIKE $%d", argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_groups `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.APIGroup
	for rows.Next() {
		var g domain.APIGroup
		if err := rows.Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &g)
	}
	return list, total, rows.Err()
}

func (r *APIGroupRepo) GetAPIGroupByID(ctx context.Context, tenantID, id int64) (*domain.APIGroup, error) {
	var g domain.APIGroup
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *APIGroupRepo) GetAPIGroupByName(ctx context.Context, tenantID, projectID int64, name string) (*domain.APIGroup, error) {
	var g domain.APIGroup
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, description, created_at FROM api_groups WHERE tenant_id=$1 AND project_id=$2 AND name=$3`,
		tenantID, projectID, name).Scan(&g.ID, &g.TenantID, &g.ProjectID, &g.Name, &g.Description, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}
