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
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			slug TEXT NOT NULL UNIQUE,
			plan TEXT NOT NULL DEFAULT 'Free',
			status TEXT NOT NULL DEFAULT 'Active',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS tenant_members (
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL DEFAULT 'Viewer',
			joined_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS runners (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			token TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'offline',
			ip TEXT,
			last_seen TIMESTAMPTZ DEFAULT NOW(),
			version TEXT,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS datasources (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id TEXT NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			dsn TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_endpoints (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id TEXT NOT NULL,
			path TEXT NOT NULL,
			methods TEXT[] NOT NULL,
			datasource_id TEXT NOT NULL,
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

	slog.Info("Database schema initialized")
	return nil
}

// ==================== TenantRepository ====================

func (r *Repository) CreateTenant(ctx context.Context, t *domain.Tenant) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO tenants (id, name, slug, plan, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		t.ID, t.Name, t.Slug, t.Plan, t.Status, t.CreatedAt, t.UpdatedAt)
	return err
}

func (r *Repository) GetTenantByID(ctx context.Context, id string) (*domain.Tenant, error) {
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

func (r *Repository) ListTenants(ctx context.Context) ([]*domain.Tenant, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, name, slug, plan, status, created_at, updated_at FROM tenants ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenants []*domain.Tenant
	for rows.Next() {
		var t domain.Tenant
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Plan, &t.Status, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tenants = append(tenants, &t)
	}
	return tenants, nil
}

func (r *Repository) UpdateTenant(ctx context.Context, t *domain.Tenant) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE tenants SET name=$1, plan=$2, status=$3, updated_at=$4 WHERE id=$5`,
		t.Name, t.Plan, t.Status, time.Now(), t.ID)
	return err
}

// ==================== UserRepository ====================

func (r *Repository) CreateUser(ctx context.Context, u *domain.User) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
		u.ID, u.Email, u.Name, u.PasswordHash, u.CreatedAt, u.UpdatedAt)
	return err
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx, `SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE id=$1`, id).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.pool.QueryRow(ctx, `SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email=$1`, email).
		Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ==================== TenantMemberRepository ====================

func (r *Repository) AddMember(ctx context.Context, m *domain.TenantMember) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO tenant_members (tenant_id, user_id, role, joined_at) VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, user_id) DO NOTHING`,
		m.TenantID, m.UserID, m.Role, m.JoinedAt)
	return err
}

func (r *Repository) RemoveMember(ctx context.Context, tenantID, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM tenant_members WHERE tenant_id=$1 AND user_id=$2`, tenantID, userID)
	return err
}

func (r *Repository) GetMembersByTenantID(ctx context.Context, tenantID string) ([]*domain.TenantMember, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT tm.tenant_id, tm.user_id, tm.role, tm.joined_at, u.id, u.email, u.name, u.created_at, u.updated_at
		 FROM tenant_members tm JOIN users u ON tm.user_id = u.id
		 WHERE tm.tenant_id=$1 ORDER BY tm.joined_at`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.TenantMember
	for rows.Next() {
		m := &domain.TenantMember{User: &domain.User{}}
		if err := rows.Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt,
			&m.User.ID, &m.User.Email, &m.User.Name, &m.User.CreatedAt, &m.User.UpdatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *Repository) GetMembersByUserID(ctx context.Context, userID string) ([]*domain.TenantMember, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_members WHERE user_id=$1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*domain.TenantMember
	for rows.Next() {
		var m domain.TenantMember
		if err := rows.Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, &m)
	}
	return members, nil
}

func (r *Repository) GetMembership(ctx context.Context, tenantID, userID string) (*domain.TenantMember, error) {
	var m domain.TenantMember
	err := r.pool.QueryRow(ctx,
		`SELECT tenant_id, user_id, role, joined_at FROM tenant_members WHERE tenant_id=$1 AND user_id=$2`,
		tenantID, userID).Scan(&m.TenantID, &m.UserID, &m.Role, &m.JoinedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) UpdateMemberRole(ctx context.Context, tenantID, userID string, role domain.UserRole) error {
	_, err := r.pool.Exec(ctx, `UPDATE tenant_members SET role=$1 WHERE tenant_id=$2 AND user_id=$3`, role, tenantID, userID)
	return err
}

// ==================== RunnerRepository ====================

func (r *Repository) CreateRunner(ctx context.Context, runner *domain.Runner) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO runners (id, tenant_id, name, token, status, version) VALUES ($1,$2,$3,$4,$5,$6)
		 ON CONFLICT (tenant_id, id) DO UPDATE SET name=$3, status=$5, version=$6`,
		runner.ID, runner.TenantID, runner.Name, runner.Token, runner.Status, runner.Version)
	return err
}

func (r *Repository) GetRunnerByID(ctx context.Context, tenantID, id string) (*domain.Runner, error) {
	var runner domain.Runner
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, status, ip, last_seen, version FROM runners WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&runner.ID, &runner.TenantID, &runner.Name, &runner.Status, &runner.IP, &runner.LastSeen, &runner.Version)
	if err != nil {
		return nil, err
	}
	return &runner, nil
}

func (r *Repository) UpdateRunnerStatus(ctx context.Context, tenantID, id, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE runners SET status=$1, last_seen=$2 WHERE tenant_id=$3 AND id=$4`, status, time.Now(), tenantID, id)
	return err
}

func (r *Repository) RunnerHeartbeat(ctx context.Context, tenantID, id string) error {
	return r.UpdateRunnerStatus(ctx, tenantID, id, "online")
}

// ==================== ProjectRepository ====================

func (r *Repository) GetAPIEndpointByPath(ctx context.Context, tenantID, path string) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, path, methods, datasource_id, sql_query, params FROM api_endpoints WHERE tenant_id=$1 AND path=$2`,
		tenantID, path).Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.Path, &ep.Methods, &ep.DataSourceID, &ep.SQL, &ep.Params)
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func (r *Repository) GetDataSourceByID(ctx context.Context, tenantID, id string) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, project_id, name, type, dsn FROM datasources WHERE tenant_id=$1 AND id=$2`,
		tenantID, id).Scan(&ds.ID, &ds.TenantID, &ds.ProjectID, &ds.Name, &ds.Type, &ds.DSN)
	if err != nil {
		return nil, err
	}
	return &ds, nil
}
