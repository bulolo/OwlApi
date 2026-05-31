package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type ScriptRepo struct{ DB *DB }

var _ domain.ScriptRepository = (*ScriptRepo)(nil)

func (r *ScriptRepo) Create(ctx context.Context, s *domain.Script) error {
	var tenantID interface{}
	if !s.IsPlatform {
		tenantID = s.TenantID
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO scripts (tenant_id, name, type, code, description, is_platform) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		tenantID, s.Name, s.Type, s.Code, s.Description, s.IsPlatform).Scan(&s.ID)
}

func (r *ScriptRepo) Update(ctx context.Context, s *domain.Script) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE scripts SET name=$1, type=$2, code=$3, description=$4 WHERE tenant_id=$5 AND id=$6`,
		s.Name, s.Type, s.Code, s.Description, s.TenantID, s.ID)
	return err
}

func (r *ScriptRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	var s domain.Script
	var tid *int64
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, type, code, description, is_platform, created_at
		 FROM scripts WHERE (tenant_id=$1 OR is_platform=TRUE) AND id=$2`,
		tenantID, id).Scan(&s.ID, &tid, &s.Name, &s.Type, &s.Code, &s.Description, &s.IsPlatform, &s.CreatedAt)
	if err != nil {
		return nil, nfErr(err, "script")
	}
	if tid != nil {
		s.TenantID = *tid
	}
	return &s, nil
}

func (r *ScriptRepo) GetByName(ctx context.Context, tenantID int64, name string) (*domain.Script, error) {
	var s domain.Script
	var tid *int64
	var query string
	var args []interface{}
	if tenantID == 0 {
		// tenantID=0 is used by seed/init to check platform scripts only.
		query = `SELECT id, tenant_id, name, type, code, description, is_platform, created_at
		         FROM scripts WHERE is_platform=TRUE AND name=$1`
		args = []interface{}{name}
	} else {
		// 租户维度按名查找——仅命中租户自己的脚本（不含平台内置），
		// 这样租户可拥有与内置同名的副本，且创建/复制的重名校验只针对自己的库。
		query = `SELECT id, tenant_id, name, type, code, description, is_platform, created_at
		         FROM scripts WHERE tenant_id=$1 AND name=$2`
		args = []interface{}{tenantID, name}
	}
	err := r.DB.Pool.QueryRow(ctx, query, args...).Scan(
		&s.ID, &tid, &s.Name, &s.Type, &s.Code, &s.Description, &s.IsPlatform, &s.CreatedAt)
	if err != nil {
		return nil, nfErr(err, "script")
	}
	if tid != nil {
		s.TenantID = *tid
	}
	return &s, nil
}

func (r *ScriptRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Script, int, error) {
	// 只返回租户自己的脚本；平台内置脚本不混入租户脚本库（通过「从内置添加」复制进来）。
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM scripts `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	// ref_count: how many of this tenant's endpoints reference each script as a
	// library step (script_id inside the pre_scripts / post_scripts JSONB chains).
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, name, type, code, description, is_platform, created_at,
		             (SELECT COUNT(*) FROM api_endpoints ae
		              WHERE ae.tenant_id=$1
		                AND (ae.pre_scripts @> jsonb_build_array(jsonb_build_object('script_id', scripts.id))
		                  OR ae.post_scripts @> jsonb_build_array(jsonb_build_object('script_id', scripts.id)))) AS ref_count
		             FROM scripts %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.Script
	for rows.Next() {
		var s domain.Script
		var tid *int64
		if err := rows.Scan(&s.ID, &tid, &s.Name, &s.Type, &s.Code, &s.Description, &s.IsPlatform, &s.CreatedAt, &s.RefCount); err != nil {
			return nil, 0, err
		}
		if tid != nil {
			s.TenantID = *tid
		}
		list = append(list, &s)
	}
	return list, total, rows.Err()
}

func (r *ScriptRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM scripts WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}

func (r *ScriptRepo) CountReferences(ctx context.Context, tenantID, scriptID int64) (int, error) {
	var n int
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM api_endpoints
		 WHERE tenant_id=$1
		   AND (pre_scripts @> jsonb_build_array(jsonb_build_object('script_id', $2::bigint))
		     OR post_scripts @> jsonb_build_array(jsonb_build_object('script_id', $2::bigint)))`,
		tenantID, scriptID).Scan(&n)
	return n, err
}

func (r *ScriptRepo) ListPlatform(ctx context.Context, p domain.ListParams) ([]*domain.Script, int, error) {
	where := "WHERE is_platform=TRUE"
	var args []interface{}
	argN := 1
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}
	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM scripts `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, name, type, code, description, is_platform, created_at
		             FROM scripts %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.Script
	for rows.Next() {
		var s domain.Script
		var tid *int64
		if err := rows.Scan(&s.ID, &tid, &s.Name, &s.Type, &s.Code, &s.Description, &s.IsPlatform, &s.CreatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, &s)
	}
	return list, total, rows.Err()
}

func (r *ScriptRepo) UpdatePlatform(ctx context.Context, s *domain.Script) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE scripts SET name=$1, type=$2, code=$3, description=$4 WHERE is_platform=TRUE AND id=$5`,
		s.Name, s.Type, s.Code, s.Description, s.ID)
	return err
}

func (r *ScriptRepo) DeletePlatform(ctx context.Context, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM scripts WHERE is_platform=TRUE AND id=$1`, id)
	return err
}
