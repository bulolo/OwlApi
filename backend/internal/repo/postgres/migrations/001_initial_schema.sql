-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'Free',
    status TEXT NOT NULL DEFAULT 'Active',
    max_release_versions INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS tenant_users (
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Viewer',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS gateways (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    ip TEXT NOT NULL DEFAULT '',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    version TEXT NOT NULL DEFAULT ''
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, slug)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS datasources (
    id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    is_dual BOOLEAN NOT NULL DEFAULT FALSE,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS datasource_envs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    datasource_id BIGINT NOT NULL,
    env TEXT NOT NULL DEFAULT 'prod',
    dsn TEXT NOT NULL,
    gateway_id BIGINT NOT NULL,
    UNIQUE (tenant_id, datasource_id, env)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS api_groups (
    id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS api_endpoints (
    id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
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
    status TEXT NOT NULL DEFAULT 'draft',
    published_release_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, project_id, path, methods)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS endpoint_releases (
    id BIGSERIAL NOT NULL,
    tenant_id BIGINT NOT NULL,
    endpoint_id BIGINT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    note TEXT NOT NULL DEFAULT '',
    snapshot JSONB NOT NULL DEFAULT '{}',
    published_by BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS scripts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'pre',
    code TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose StatementEnd

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT PRIMARY KEY DEFAULT 1,
    allow_self_register BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (id = 1)
);
-- +goose StatementEnd

-- +goose StatementBegin
INSERT INTO platform_settings (id, allow_self_register) VALUES (1, true) ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_datasource_envs_lookup ON datasource_envs(tenant_id, datasource_id, env);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project ON api_endpoints(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_releases_endpoint ON endpoint_releases(tenant_id, endpoint_id);
CREATE INDEX IF NOT EXISTS idx_gateways_token ON gateways(token);
CREATE INDEX IF NOT EXISTS idx_datasources_tenant ON datasources(tenant_id);
-- +goose StatementEnd

-- +goose Down
DROP INDEX IF EXISTS idx_tenant_users_user_id;
DROP INDEX IF EXISTS idx_datasource_envs_lookup;
DROP INDEX IF EXISTS idx_api_endpoints_project;
DROP INDEX IF EXISTS idx_endpoint_releases_endpoint;
DROP INDEX IF EXISTS idx_gateways_token;
DROP INDEX IF EXISTS idx_datasources_tenant;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS scripts;
DROP TABLE IF EXISTS endpoint_releases;
DROP TABLE IF EXISTS api_endpoints;
DROP TABLE IF EXISTS api_groups;
DROP TABLE IF EXISTS datasource_envs;
DROP TABLE IF EXISTS datasources;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS gateways;
DROP TABLE IF EXISTS tenant_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
