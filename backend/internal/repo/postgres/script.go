package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type ScriptRepo struct{ DB *DB }

var _ domain.ScriptRepository = (*ScriptRepo)(nil)

func (r *ScriptRepo) CreateScript(ctx context.Context, s *domain.Script) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO scripts (tenant_id, name, type, code, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		s.TenantID, s.Name, s.Type, s.Code, s.Description).Scan(&s.ID)
}

func (r *ScriptRepo) UpdateScript(ctx context.Context, s *domain.Script) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE scripts SET name=$1, type=$2, code=$3, description=$4 WHERE tenant_id=$5 AND id=$6`,
		s.Name, s.Type, s.Code, s.Description, s.TenantID, s.ID)
	return err
}

func (r *ScriptRepo) GetScriptByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	var s domain.Script
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ScriptRepo) GetScriptByName(ctx context.Context, tenantID int64, name string) (*domain.Script, error) {
	var s domain.Script
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts WHERE tenant_id=$1 AND name=$2`,
		tenantID, name).Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ScriptRepo) ListScripts(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Script, int, error) {
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM scripts `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, name, type, code, description, created_at FROM scripts %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.Script
	for rows.Next() {
		var s domain.Script
		if err := rows.Scan(&s.ID, &s.TenantID, &s.Name, &s.Type, &s.Code, &s.Description, &s.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &s)
	}
	return list, total, rows.Err()
}

func (r *ScriptRepo) DeleteScript(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM scripts WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
