package postgres

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(ctx context.Context, dsn string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSN: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	db := &DB{Pool: pool}
	if err := db.initSchema(ctx); err != nil {
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}
	return db, nil
}

func (db *DB) initSchema(ctx context.Context) error {
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
		`CREATE TABLE IF NOT EXISTS gateways (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			token TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'offline',
			ip TEXT NOT NULL DEFAULT '',
			last_seen TIMESTAMPTZ DEFAULT NOW(),
			version TEXT NOT NULL DEFAULT '',
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
			name TEXT NOT NULL,
			is_dual BOOLEAN NOT NULL DEFAULT FALSE,
			type TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS datasource_envs (
			id BIGSERIAL PRIMARY KEY,
			datasource_id BIGINT NOT NULL,
			tenant_id BIGINT NOT NULL,
			env TEXT NOT NULL DEFAULT 'prod',
			dsn TEXT NOT NULL,
			gateway_id BIGINT NOT NULL,
			UNIQUE (tenant_id, datasource_id, env)
		)`,
		`CREATE TABLE IF NOT EXISTS api_groups (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id BIGINT NOT NULL,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_endpoints (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			project_id BIGINT NOT NULL,
			group_id BIGINT NOT NULL DEFAULT 0,
			datasource_id BIGINT NOT NULL DEFAULT 0,
			path TEXT NOT NULL,
			methods TEXT[] NOT NULL,
			summary TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			sql_query TEXT NOT NULL,
			params TEXT[] DEFAULT '{}',
			param_defs JSONB DEFAULT '[]',
			pre_script_id BIGINT NOT NULL DEFAULT 0,
			post_script_id BIGINT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id),
			UNIQUE (tenant_id, path)
		)`,
		`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_release_versions INT NOT NULL DEFAULT 10`,
		// Release columns added after initial schema — safe to re-run via IF NOT EXISTS / idempotent ALTER
		`ALTER TABLE api_endpoints ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'`,
		`ALTER TABLE api_endpoints ADD COLUMN IF NOT EXISTS published_release_id BIGINT NOT NULL DEFAULT 0`,
		`CREATE TABLE IF NOT EXISTS endpoint_releases (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			endpoint_id BIGINT NOT NULL,
			version INT NOT NULL DEFAULT 1,
			note TEXT NOT NULL DEFAULT '',
			snapshot JSONB NOT NULL DEFAULT '{}',
			published_by BIGINT NOT NULL DEFAULT 0,
			published_at TIMESTAMPTZ DEFAULT NOW(),
			is_active BOOLEAN NOT NULL DEFAULT FALSE,
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS scripts (
			id BIGSERIAL NOT NULL,
			tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'pre',
			code TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			PRIMARY KEY (tenant_id, id)
		)`,
		`CREATE TABLE IF NOT EXISTS platform_settings (
			id INT PRIMARY KEY DEFAULT 1,
			allow_self_register BOOLEAN NOT NULL DEFAULT TRUE,
			CHECK (id = 1)
		)`,
		`INSERT INTO platform_settings (id, allow_self_register) VALUES (1, true) ON CONFLICT DO NOTHING`,
		`ALTER TABLE endpoint_releases ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE`,
	}
	for _, q := range queries {
		if _, err := db.Pool.Exec(ctx, q); err != nil {
			return err
		}
	}
	slog.Info("Database schema initialized")
	return nil
}
