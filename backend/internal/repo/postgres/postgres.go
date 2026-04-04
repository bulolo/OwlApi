package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(ctx context.Context, dsn string) (*Repository, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	repo := &Repository{pool: pool}
	if err := repo.initSchema(ctx); err != nil {
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}

	return repo, nil
}

func (r *Repository) initSchema(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS tenants (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			plan TEXT NOT NULL DEFAULT 'Free',
			status TEXT NOT NULL DEFAULT 'Active',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS tenant_users (
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL DEFAULT 'Viewer',
			joined_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS runners (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			token TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'offline',
			ip TEXT,
			last_seen TIMESTAMPTZ DEFAULT NOW(),
			version TEXT,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS projects (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS datasources (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			dsn TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_endpoints (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id BIGINT NOT NULL,
			path TEXT NOT NULL,
			methods TEXT[] NOT NULL,
			datasource_id BIGINT NOT NULL,
			sql_query TEXT NOT NULL,
			params TEXT[] DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id),
			UNIQUE (tenant_id, path)
		)`,
	}

	for _, q := range queries {
		if _, err := r.pool.Exec(ctx, q); err != nil {
			return err
		}
	}

	// Migration: add is_superadmin column if not exists
	r.pool.Exec(ctx, `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE`)

	slog.Info("Database schema initialized")
	return nil
}

// ==================== TenantRepository ====================

func (r *Repository) CreateTenant(ctx context.Context, t *domain.Tenant) error {
	return r.pool.QueryRow(ctx,
		`INSERT INTO tenants (name, slug, plan, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		t.Name, t.Slug, t.Plan, t.Status, t.CreatedAt, t.UpdatedAt).Scan(&t.ID)
}

func (r *Repository) GetTenantByID(ctx context.Context, id int64) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.pool.QueryRow(ctx, `SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants WHERE id=$1`, id).
		Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	var t domain.Tenant
	err := r.pool.QueryRow(ctx, `SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants WHERE slug=$1`, slug).
		Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) ListTenants(ctx context.Context, page, size int) ([]*domain.Tenant, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenants`).Scan(&total); err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * size
	rows, err := r.pool.Query(ctx, `SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`, size, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, err
		}
		tenants = append(tenants, &t)
	}
	return tenants, total, nil
}

func (r *Repository) UpdateTenant(ctx context.Context, t *domain.Tenant) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tenants SET name=$1, plan=$2, status=$3, updated_at=$4 WHERE id=$5`,
		t.Name, t.Plan, t.Status, time.Now(), t.ID)
	return err
}

func (r *Repository) DeleteTenant(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM tenants WHERE id=$1`, id)
	return err
}

// ==================== UserRepository ====================

func (r *Repository) CreateUser(ctx context.Context, u *domain.User) error {
	return r.pool.QueryRow(ctx,
		`INSERT INTO users (email, name, password_hash, is_superadmin, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		u.Email, u.Name, u.PasswordHash, u.IsSuperAdmin, u.CreatedAt, u.UpdatedAt).Scan(&u.ID)
}

func (r *Repository) GetUserByID(ctx context.Context, id int64) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx, `SELECT id, email, name, password_hash, is_superadmin, created_at, updated_at FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.IsSuperAdmin, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx, `SELECT id, email, name, password_hash, is_superadmin, created_at, updated_at FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.IsSuperAdmin, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ==================== TenantUserRepository ====================

func (r *Repository) AddTenantUser(ctx context.Context, m *domain.TenantUser) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO tenant_users (tenant_id, user_id, role, joined_at) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, user_id) DO NOTHING`,
		m.TenantID, m.UserID, m.Role, m.JoinedAt)
	return err
}

func (r *Repository) RemoveTenantUser(ctx context.Context, tenantID, userID int64) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM tenant_users WHERE tenant_id=$1 AND user_id=$2`, tenantID, userID)
	return err
}

func (r *Repository) GetTenantUsersByTenantID(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tenant_users WHERE tenant_id=$1`, tenantID).Scan(&total); err != nil {
		return nil, 0, err
	}
	offset := (page - 1) * size
	rows, err := r.pool.Query(ctx,
		`SELECT tm.tenant_id, tm.user_id, tm.role, tm.joined_at, u.id, u.email, u.name, u.is_superadmin, u.created_at, u.updated_at
		 FROM tenant_users tm JOIN users u ON tm.user_id = u.id
		 WHERE tm.tenant_id=$1 ORDER BY tm.joined_at LIMIT $2 OFFSET $3`, tenantID, size, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*domain.TenantUser
	for rows.Next() {
		m := &domain.TenantUser{User: &domain.User{}}
		if err := rows.Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt,
			&m.User.ID, &m.User.Email, &m.User.Name, &m.User.IsSuperAdmin, &m.User.CreatedAt, &m.User.UpdatedAt); err != nil {
			return nil, 0, err
		}
		users = append(users, m)
	}
	return users, total, nil
}

func (r *Repository) GetTenantUsersByUserID(ctx context.Context, userID int64) ([]*domain.TenantUser, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_users WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*domain.TenantUser
	for rows.Next() {
		var m domain.TenantUser
		if err := rows.Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		users = append(users, &m)
	}
	return users, nil
}

func (r *Repository) GetTenantUserByTenantAndUser(ctx context.Context, tenantID, userID int64) (*domain.TenantUser, error) {
	var m domain.TenantUser
	err := r.pool.QueryRow(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_users WHERE tenant_id=$1 AND user_id=$2`,
		tenantID, userID).Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) UpdateTenantUserRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error {
	_, err := r.pool.Exec(ctx, `UPDATE tenant_users SET role=$1 WHERE tenant_id=$2 AND user_id=$3`, role, tenantID, userID)
	return err
}

// ==================== RunnerRepository ====================

func (r *Repository) CreateRunner(ctx context.Context, runner *domain.Runner) error {
	if runner.ID > 0 {
		// Insert with explicit ID
		_, err := r.pool.Exec(ctx,
			`INSERT INTO runners (id, tenant_id, name, token, status, version, last_seen) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			runner.ID, runner.TenantID, runner.Name, runner.Token, runner.Status, runner.Version, time.Now())
		return err
	}
	return r.pool.QueryRow(ctx,
		`INSERT INTO runners (tenant_id, name, token, status, version, last_seen) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		runner.TenantID, runner.Name, runner.Token, runner.Status, runner.Version, time.Now()).Scan(&runner.ID)
}

func (r *Repository) GetRunnerByID(ctx context.Context, tenantID, id int64) (*domain.Runner, error) {
	var runner domain.Runner
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, token, status, COALESCE(ip,''), last_seen, COALESCE(version,'') FROM runners WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&runner.ID, &runner.TenantID, &runner.Name, &runner.Token, &runner.Status, &runner.IP, &runner.LastSeen, &runner.Version)
	if err != nil {
		return nil, err
	}
	return &runner, nil
}

func (r *Repository) UpdateRunnerStatus(ctx context.Context, tenantID, id int64, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE runners SET status=$1, last_seen=$2 WHERE tenant_id=$3 AND id=$4`, status, time.Now(), tenantID, id)
	return err
}

func (r *Repository) RunnerHeartbeat(ctx context.Context, tenantID, id int64) error {
	return r.UpdateRunnerStatus(ctx, tenantID, id, "online")
}

// ==================== ProjectRepository ====================

func (r *Repository) GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, path, methods, datasource_id, sql_query, params FROM api_endpoints WHERE tenant_id=$1 AND path=$2`,
		tenantID, path).Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.Path, &ep.Methods, &ep.DataSourceID, &ep.SQL, &ep.Params)
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func (r *Repository) GetDataSourceByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, type, dsn FROM datasources WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&ds.ID, &ds.TenantID, &ds.ProjectID, &ds.Name, &ds.Type, &ds.DSN)
	if err != nil {
		return nil, err
	}
	return &ds, nil
}
