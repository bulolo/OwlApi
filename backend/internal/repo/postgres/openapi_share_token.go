package postgres

import (
	"context"
	"errors"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/jackc/pgx/v5"
)

type OpenAPIShareTokenRepo struct{ DB *DB }

// Upsert creates a share token for the project+env, returning the existing one if already present.
func (r *OpenAPIShareTokenRepo) Upsert(ctx context.Context, tenantID, projectID int64, env string) (*domain.OpenAPIShareToken, error) {
	var t domain.OpenAPIShareToken
	err := r.DB.Pool.QueryRow(ctx,
		`INSERT INTO openapi_share_tokens (tenant_id, project_id, env)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, project_id, env) DO UPDATE SET created_at = openapi_share_tokens.created_at
         RETURNING token, tenant_id, project_id, env, created_at`,
		tenantID, projectID, env,
	).Scan(&t.Token, &t.TenantID, &t.ProjectID, &t.Env, &t.CreatedAt)
	return &t, err
}

func (r *OpenAPIShareTokenRepo) GetByProjectEnv(ctx context.Context, tenantID, projectID int64, env string) (*domain.OpenAPIShareToken, error) {
	var t domain.OpenAPIShareToken
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT token, tenant_id, project_id, env, created_at
         FROM openapi_share_tokens WHERE tenant_id=$1 AND project_id=$2 AND env=$3`,
		tenantID, projectID, env,
	).Scan(&t.Token, &t.TenantID, &t.ProjectID, &t.Env, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *OpenAPIShareTokenRepo) GetByToken(ctx context.Context, token string) (*domain.OpenAPIShareToken, error) {
	var t domain.OpenAPIShareToken
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT token, tenant_id, project_id, env, created_at
         FROM openapi_share_tokens WHERE token=$1`,
		token,
	).Scan(&t.Token, &t.TenantID, &t.ProjectID, &t.Env, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *OpenAPIShareTokenRepo) DeleteByProjectEnv(ctx context.Context, tenantID, projectID int64, env string) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM openapi_share_tokens WHERE tenant_id=$1 AND project_id=$2 AND env=$3`,
		tenantID, projectID, env,
	)
	return err
}
