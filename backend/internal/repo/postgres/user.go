package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

type UserRepo struct{ DB *DB }

var _ domain.UserRepository = (*UserRepo)(nil)

func (r *UserRepo) Create(ctx context.Context, u *domain.User) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO users (email, name, password_hash, is_superadmin, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		u.Email, u.Name, u.PasswordHash, u.IsSuperAdmin, u.CreatedAt, u.UpdatedAt).Scan(&u.ID)
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	var u domain.User
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, email, name, password_hash, is_superadmin, created_at, updated_at FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.IsSuperAdmin, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT id, email, name, password_hash, is_superadmin, created_at, updated_at FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.IsSuperAdmin, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
