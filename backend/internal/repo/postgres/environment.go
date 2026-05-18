package postgres

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectEnvironmentRepo struct{ DB *DB }

var _ domain.ProjectEnvironmentRepository = (*ProjectEnvironmentRepo)(nil)

const envCols = `id, tenant_id, project_id, name, is_default, created_at`

func scanEnv(scan func(dest ...any) error) (*domain.ProjectEnvironment, error) {
	var e domain.ProjectEnvironment
	if err := scan(&e.ID, &e.TenantID, &e.ProjectID, &e.Name, &e.IsDefault, &e.CreatedAt); err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *ProjectEnvironmentRepo) Create(ctx context.Context, env *domain.ProjectEnvironment) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO project_environments (tenant_id, project_id, name, is_default) VALUES ($1,$2,$3,$4) RETURNING id, created_at`,
		env.TenantID, env.ProjectID, env.Name, env.IsDefault,
	).Scan(&env.ID, &env.CreatedAt)
}

func (r *ProjectEnvironmentRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.ProjectEnvironment, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+envCols+` FROM project_environments WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return scanEnv(row.Scan)
}

func (r *ProjectEnvironmentRepo) GetByName(ctx context.Context, tenantID, projectID int64, name string) (*domain.ProjectEnvironment, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+envCols+` FROM project_environments WHERE tenant_id=$1 AND project_id=$2 AND name=$3`,
		tenantID, projectID, name)
	return scanEnv(row.Scan)
}

func (r *ProjectEnvironmentRepo) GetDefault(ctx context.Context, tenantID, projectID int64) (*domain.ProjectEnvironment, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+envCols+` FROM project_environments WHERE tenant_id=$1 AND project_id=$2 AND is_default=TRUE LIMIT 1`,
		tenantID, projectID)
	return scanEnv(row.Scan)
}

func (r *ProjectEnvironmentRepo) ListByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.ProjectEnvironment, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT `+envCols+` FROM project_environments WHERE tenant_id=$1 AND project_id=$2 ORDER BY is_default DESC, id`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.ProjectEnvironment
	for rows.Next() {
		e, err := scanEnv(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

// Update changes name + is_default. If is_default flips to true, the caller is
// responsible for resetting the previously-default env first (we keep this repo
// dumb and let the service enforce the "exactly one default" invariant).
func (r *ProjectEnvironmentRepo) Update(ctx context.Context, env *domain.ProjectEnvironment) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE project_environments SET name=$1, is_default=$2 WHERE tenant_id=$3 AND id=$4`,
		env.Name, env.IsDefault, env.TenantID, env.ID)
	return err
}

func (r *ProjectEnvironmentRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM project_environments WHERE tenant_id=$1 AND id=$2`,
		tenantID, id)
	return err
}
