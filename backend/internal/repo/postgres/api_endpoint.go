package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

func (r *ProjectRepo) GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, path, methods, sql_query, params FROM api_endpoints WHERE tenant_id=$1 AND path=$2`,
		tenantID, path).Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.Path, &ep.Methods, &ep.SQL, &ep.Params)
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func (r *ProjectRepo) CreateAPIEndpoint(ctx context.Context, ep *domain.APIEndpoint) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_endpoints (tenant_id, project_id, path, methods, sql_query, params) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		ep.TenantID, ep.ProjectID, ep.Path, ep.Methods, ep.SQL, ep.Params).Scan(&ep.ID)
}

func (r *ProjectRepo) ListAPIEndpoints(ctx context.Context, tenantID, projectID int64) ([]*domain.APIEndpoint, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, project_id, path, methods, sql_query, params, created_at FROM api_endpoints WHERE tenant_id=$1 AND project_id=$2 ORDER BY id`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.APIEndpoint
	for rows.Next() {
		var ep domain.APIEndpoint
		if err := rows.Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.Path, &ep.Methods, &ep.SQL, &ep.Params, &ep.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &ep)
	}
	return list, nil
}

func (r *ProjectRepo) DeleteAPIEndpoint(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
