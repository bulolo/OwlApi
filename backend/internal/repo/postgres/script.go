package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

func (r *ProjectRepo) CreateScript(ctx context.Context, s *domain.Script) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO scripts (tenant_id, name, type, code, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		s.TenantID, s.Name, s.Type, s.Code, s.Description).Scan(&s.ID)
}

func (r *ProjectRepo) UpdateScript(ctx context.Context, s *domain.Script) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE scripts SET name=$1, type=$2, code=$3, description=$4 WHERE tenant_id=$5 AND id=$6`,
		s.Name, s.Type, s.Code, s.Description, s.TenantID, s.ID)
	return err
}

func (r *ProjectRepo) GetScriptByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	var s domain.Script
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ProjectRepo) GetScriptByName(ctx context.Context, tenantID int64, name string) (*domain.Script, error) {
	var s domain.Script
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ProjectRepo) ListScripts(ctx context.Context, tenantID int64) ([]*domain.Script, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts WHERE tenant_id=$1 ORDER BY id`,
		tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.Script
	for rows.Next() {
		var s domain.Script
		if err := rows.Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ProjectRepo) DeleteScript(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM scripts WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
