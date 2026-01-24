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
		`CREATE TABLE IF NOT EXISTS runners (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL,
			name TEXT NOT NULL,
			token TEXT NOT NULL,
			status TEXT NOT NULL,
			ip TEXT,
			last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			version TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL,
			name TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS datasources (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL,
			project_id TEXT NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			dsn TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_endpoints (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL,
			project_id TEXT NOT NULL,
			path TEXT NOT NULL,
			methods TEXT[] NOT NULL,
			datasource_id TEXT NOT NULL,
			sql_query TEXT NOT NULL,
			params TEXT[] NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tenant_id, id),
			UNIQUE (tenant_id, path)
		)`,
		`CREATE TABLE IF NOT EXISTS ai_proxy_configs (
			id TEXT NOT NULL,
			tenant_id TEXT NOT NULL,
			project_id TEXT NOT NULL,
			name TEXT NOT NULL,
			model TEXT NOT NULL,
			endpoint TEXT NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (tenant_id, id)
		)`,
	}

	for _, q := range queries {
		if _, err := r.pool.Exec(ctx, q); err != nil {
			return err
		}
	}

	slog.Info("Database schema initialized with multi-tenancy support")
	return nil
}

// RunnerRepository implementation
func (r *Repository) Create(ctx context.Context, runner *domain.Runner) error {
	_, err := r.pool.Exec(ctx,
		"INSERT INTO runners (id, tenant_id, name, token, status, version) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tenant_id, id) DO UPDATE SET name = $3, status = $5, version = $6",
		runner.ID, runner.TenantID, runner.Name, runner.Token, runner.Status, runner.Version,
	)
	return err
}

func (r *Repository) GetByID(ctx context.Context, tenantID, id string) (*domain.Runner, error) {
	var runner domain.Runner
	err := r.pool.QueryRow(ctx, "SELECT id, tenant_id, name, status, ip, last_seen, version FROM runners WHERE tenant_id = $1 AND id = $2", tenantID, id).
		Scan(&runner.ID, &runner.TenantID, &runner.Name, &runner.Status, &runner.IP, &runner.LastSeen, &runner.Version)
	if err != nil {
		return nil, err
	}
	return &runner, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, tenantID, id string, status string) error {
	_, err := r.pool.Exec(ctx, "UPDATE runners SET status = $1, last_seen = $2 WHERE tenant_id = $3 AND id = $4", status, time.Now(), tenantID, id)
	return err
}

func (r *Repository) Heartbeat(ctx context.Context, tenantID, id string) error {
	return r.UpdateStatus(ctx, tenantID, id, "online")
}

// ProjectRepository implementation
func (r *Repository) GetAPIEndpointByPath(ctx context.Context, tenantID, path string) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	err := r.pool.QueryRow(ctx, "SELECT id, tenant_id, project_id, path, methods, datasource_id, sql_query, params FROM api_endpoints WHERE tenant_id = $1 AND path = $2", tenantID, path).
		Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.Path, &ep.Methods, &ep.DataSourceID, &ep.SQL, &ep.Params)
	if err != nil {
		return nil, err
	}
	return &ep, nil
}

func (r *Repository) GetDataSourceByID(ctx context.Context, tenantID, id string) (*domain.DataSource, error) {
	var ds domain.DataSource
	err := r.pool.QueryRow(ctx, "SELECT id, tenant_id, project_id, name, type, dsn FROM datasources WHERE tenant_id = $1 AND id = $2", tenantID, id).
		Scan(&ds.ID, &ds.TenantID, &ds.ProjectID, &ds.Name, &ds.Type, &ds.DSN)
	if err != nil {
		return nil, err
	}
	return &ds, nil
}

func (r *Repository) GetAIProxyConfigByID(ctx context.Context, tenantID, id string) (*domain.AIProxyConfig, error) {
	var conf domain.AIProxyConfig
	err := r.pool.QueryRow(ctx, "SELECT id, tenant_id, project_id, name, model, endpoint FROM ai_proxy_configs WHERE tenant_id = $1 AND id = $2", tenantID, id).
		Scan(&conf.ID, &conf.TenantID, &conf.ProjectID, &conf.Name, &conf.Model, &conf.Endpoint)
	if err != nil {
		return nil, err
	}
	return &conf, nil
}
