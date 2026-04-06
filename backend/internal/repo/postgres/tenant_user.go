package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type TenantUserRepo struct{ DB *DB }

var _ domain.TenantUserRepository = (*TenantUserRepo)(nil)

func (r *TenantUserRepo) Create(ctx context.Context, tu *domain.TenantUser) error {
	_, err := r.DB.Pool.Exec(ctx,
		`INSERT INTO tenant_users (tenant_id, user_id, role, joined_at) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, user_id) DO NOTHING`,
		tu.TenantID, tu.UserID, tu.Role, tu.JoinedAt)
	return err
}

func (r *TenantUserRepo) Delete(ctx context.Context, tenantID, userID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM tenant_users WHERE tenant_id=$1 AND user_id=$2`, tenantID, userID)
	return err
}

func (r *TenantUserRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.TenantUser, int, error) {
	where := "WHERE tu.tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (u.name ILIKE $%d OR u.email ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenant_users tu JOIN users u ON tu.user_id = u.id `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT tu.tenant_id, tu.user_id, tu.role, tu.joined_at, u.id, u.email, u.name, u.is_superadmin, u.created_at, u.updated_at
		 FROM tenant_users tu JOIN users u ON tu.user_id = u.id
		 %s ORDER BY tu.joined_at%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []*domain.TenantUser
	for rows.Next() {
		tu := &domain.TenantUser{User: &domain.User{}}
		if err := rows.Scan(&tu.TenantID, &tu.UserID, &tu.Role, &tu.JoinedAt,
			&tu.User.ID, &tu.User.Email, &tu.User.Name, &tu.User.IsSuperAdmin, &tu.User.CreatedAt, &tu.User.UpdatedAt); err != nil {
			return nil, 0, err
		}
		list = append(list, tu)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *TenantUserRepo) GetByUserID(ctx context.Context, userID int64) ([]*domain.TenantUser, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_users WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*domain.TenantUser
	for rows.Next() {
		var tu domain.TenantUser
		if err := rows.Scan(&tu.TenantID, &tu.UserID, &tu.Role, &tu.JoinedAt); err != nil {
			return nil, err
		}
		list = append(list, &tu)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *TenantUserRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID int64) (*domain.TenantUser, error) {
	var tu domain.TenantUser
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_users WHERE tenant_id=$1 AND user_id=$2`,
		tenantID, userID).Scan(&tu.TenantID, &tu.UserID, &tu.Role, &tu.JoinedAt)
	if err != nil {
		return nil, err
	}
	return &tu, nil
}

func (r *TenantUserRepo) UpdateRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE tenant_users SET role=$1 WHERE tenant_id=$2 AND user_id=$3`, role, tenantID, userID)
	return err
}
