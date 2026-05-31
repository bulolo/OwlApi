-- +goose Up
-- 初始 schema（已合并历史增量迁移；作为初始版本，无兼容数据负担）。

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS tenants (
    id                   BIGSERIAL PRIMARY KEY,
    name                 TEXT NOT NULL,
    slug                 TEXT NOT NULL UNIQUE,
    status               TEXT NOT NULL DEFAULT 'Active',
    max_release_versions INT  NOT NULL DEFAULT 5,
    avatar               TEXT NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 注：plan(订阅档位)属 EE 概念，已下移到 EE 模块的 tenant_ee_configs（仅授权时迁移）；status 作为基础生命周期保留在核心。
-- +goose StatementEnd
COMMENT ON TABLE tenants IS '租户';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE users IS '用户';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS tenant_users (
    tenant_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'Viewer',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);
-- +goose StatementEnd
COMMENT ON TABLE tenant_users IS '租户成员关系';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS gateways (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    name        TEXT NOT NULL,
    token       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'offline',
    ip          TEXT NOT NULL DEFAULT '',
    last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version     TEXT NOT NULL DEFAULT ''
);
-- +goose StatementEnd
COMMENT ON TABLE gateways IS '网关节点（tenant_id NULL 表示平台级）';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS projects (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    avatar      TEXT NOT NULL DEFAULT '',
    auth_type   TEXT NOT NULL DEFAULT 'public',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, slug)
);
-- +goose StatementEnd
COMMENT ON TABLE  projects IS '项目';
COMMENT ON COLUMN projects.auth_type IS '访问鉴权类型：public / api_key / jwt';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS project_auth_keys (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   BIGINT      NOT NULL,
    project_id  BIGINT      NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('api_key', 'jwt')),
    name        TEXT        NOT NULL,
    value       TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE project_auth_keys IS '项目访问密钥（api_key / jwt 签名密钥）';

-- +goose StatementBegin
-- datasources 表 = 物理数据库连接（单一连接，无 env 概念）。
CREATE TABLE IF NOT EXISTS datasources (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    name        TEXT NOT NULL,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    type        TEXT NOT NULL,
    dsn         TEXT NOT NULL,
    gateway_id  BIGINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, name)
);
-- +goose StatementEnd
COMMENT ON TABLE datasources IS '数据源（单一物理连接）';

-- +goose StatementBegin
-- project_environments 表 = 项目层"环境"实体；每项目至少一行（默认 prod）。
CREATE TABLE IF NOT EXISTS project_environments (
    id         BIGSERIAL NOT NULL,
    tenant_id  BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    name       TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, project_id, name)
);
-- +goose StatementEnd
COMMENT ON TABLE project_environments IS '项目环境（dev / staging / prod 等）';

-- +goose StatementBegin
-- endpoint_datasource_bindings 表 = 某 env 内 alias → 物理 datasource 的映射。
CREATE TABLE IF NOT EXISTS endpoint_datasource_bindings (
    tenant_id     BIGINT NOT NULL,
    env_id        BIGINT NOT NULL,
    alias         TEXT NOT NULL,
    datasource_id BIGINT NOT NULL,
    PRIMARY KEY (tenant_id, env_id, alias)
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_datasource_bindings IS '环境内 alias → datasource 绑定';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS api_groups (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    project_id  BIGINT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd
COMMENT ON TABLE api_groups IS '接口分组';

-- +goose StatementBegin
-- api_endpoints 表 = "草稿/工作区"；线上跑哪个版本由 endpoint_active_version 决定。
-- 数据源以 alias 引用，运行时按 (env, alias) 查 endpoint_datasource_bindings 解析。
CREATE TABLE IF NOT EXISTS api_endpoints (
    id               BIGSERIAL NOT NULL,
    tenant_id        BIGINT NOT NULL,
    project_id       BIGINT NOT NULL,
    group_id         BIGINT NOT NULL DEFAULT 0,
    datasource_alias TEXT NOT NULL DEFAULT '',
    path             TEXT NOT NULL,
    method           TEXT NOT NULL DEFAULT '',
    summary          TEXT NOT NULL DEFAULT '',
    description      TEXT NOT NULL DEFAULT '',
    sql_query        TEXT NOT NULL,
    param_defs       JSONB DEFAULT '[]',
    response_defs    JSONB NOT NULL DEFAULT '[]',
    pre_scripts      JSONB NOT NULL DEFAULT '[]',
    post_scripts     JSONB NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, project_id, path, method)
);
-- +goose StatementEnd
COMMENT ON TABLE  api_endpoints IS '接口（工作区/草稿；永远代表当前编辑中的状态）';
COMMENT ON COLUMN api_endpoints.method        IS 'HTTP 方法，如 GET / POST / PUT / DELETE';
COMMENT ON COLUMN api_endpoints.param_defs    IS '参数定义（类型、是否必填、默认值等）';
COMMENT ON COLUMN api_endpoints.response_defs IS '返回字段定义（ResponseDef 数组）';
COMMENT ON COLUMN api_endpoints.pre_scripts   IS '前置脚本链 [{source,script_id|name,code}]，按顺序串行执行';
COMMENT ON COLUMN api_endpoints.post_scripts  IS '后置脚本链 [{source,script_id|name,code}]，data 顺序流过，包装脚本放链尾';

-- +goose StatementBegin
-- endpoint_versions 表 = 不可变历史快照（version 跨 env 共享）。
CREATE TABLE IF NOT EXISTS endpoint_versions (
    id                    BIGSERIAL NOT NULL,
    tenant_id             BIGINT NOT NULL,
    endpoint_id           BIGINT NOT NULL,
    version               INT NOT NULL,
    snapshot              JSONB NOT NULL,
    snapshot_v            INT NOT NULL DEFAULT 1,
    pre_script_snapshots  JSONB,
    post_script_snapshots JSONB,
    datasource_ref        JSONB,
    note                  TEXT NOT NULL DEFAULT '',
    created_by            BIGINT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, endpoint_id, version)
);
-- +goose StatementEnd
COMMENT ON TABLE  endpoint_versions IS '接口版本快照（不可变，跨 env 共享）';
COMMENT ON COLUMN endpoint_versions.pre_script_snapshots  IS '前置脚本链快照 [{id,name,type,code}]，按执行顺序';
COMMENT ON COLUMN endpoint_versions.post_script_snapshots IS '后置脚本链快照 [{id,name,type,code}]，按执行顺序';

-- +goose StatementBegin
-- endpoint_active_version 表 = 某 env 当前生效版本指针（一个接口一个 env 内至多一个 active）。
CREATE TABLE IF NOT EXISTS endpoint_active_version (
    tenant_id    BIGINT NOT NULL,
    endpoint_id  BIGINT NOT NULL,
    env_id       BIGINT NOT NULL,
    version_id   BIGINT NOT NULL,
    activated_by BIGINT NOT NULL DEFAULT 0,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, endpoint_id, env_id)
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_active_version IS '某 env 内接口当前生效版本指针';

-- +goose StatementBegin
-- endpoint_activation_log 表 = 激活历史审计流水（env 维度）。
CREATE TABLE IF NOT EXISTS endpoint_activation_log (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL,
    endpoint_id BIGINT NOT NULL,
    env_id      BIGINT,
    version_id  BIGINT,
    version     INT,
    action      TEXT NOT NULL,
    actor_id    BIGINT NOT NULL DEFAULT 0,
    at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_activation_log IS '接口激活/下线/回滚操作流水';

-- +goose StatementBegin
-- endpoint_call_logs 表 = 每次外部调用的请求流水。
CREATE TABLE IF NOT EXISTS endpoint_call_logs (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT NOT NULL,
    endpoint_id  BIGINT NOT NULL,
    env_id       BIGINT,
    version_id   BIGINT,
    version      INT,
    method       TEXT NOT NULL,
    path         TEXT NOT NULL,
    params       JSONB,
    path_params  JSONB,
    query_params JSONB,
    body_params  JSONB,
    headers      JSONB,
    status       INT NOT NULL,
    latency_ms   INT NOT NULL DEFAULT 0,
    error        TEXT NOT NULL DEFAULT '',
    ip           TEXT NOT NULL DEFAULT '',
    user_agent   TEXT NOT NULL DEFAULT '',
    at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_call_logs IS '接口调用流水（按 env 区分）';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS scripts (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'pre',
    code        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE scripts IS '脚本库（tenant_id NULL 表示平台内置脚本）';

-- 注：平台设置（品牌 + 自助注册）整体属订阅(EE)能力，已移至 EE 模块的 platform_ee_config（仅授权时迁移）；
--     核心不再存储，GET /platform/settings 在 CE 返回内置默认值。

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS openapi_share_tokens (
    token      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  BIGINT      NOT NULL,
    project_id BIGINT      NOT NULL,
    env        TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_openapi_share_tokens_project_env UNIQUE (tenant_id, project_id, env)
);
-- +goose StatementEnd
COMMENT ON TABLE openapi_share_tokens IS 'OpenAPI 只读分享令牌（按 项目+env 唯一）';

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id            ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_auth_keys_project       ON project_auth_keys(project_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_auth_keys_value  ON project_auth_keys(value) WHERE type = 'api_key';
CREATE INDEX IF NOT EXISTS idx_project_environments_lookup     ON project_environments(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_bindings_env           ON endpoint_datasource_bindings(tenant_id, env_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project           ON api_endpoints(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_api_groups_project              ON api_groups(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_versions_endpoint      ON endpoint_versions(tenant_id, endpoint_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_active_version_env     ON endpoint_active_version(tenant_id, env_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_activation_log_lookup  ON endpoint_activation_log(tenant_id, endpoint_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_activation_log_tenant_at ON endpoint_activation_log(tenant_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_lookup       ON endpoint_call_logs(tenant_id, endpoint_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_env          ON endpoint_call_logs(tenant_id, endpoint_id, env_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_status       ON endpoint_call_logs(tenant_id, endpoint_id, status, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_tenant_at    ON endpoint_call_logs(tenant_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_openapi_share_tokens_project    ON openapi_share_tokens(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_gateways_token                  ON gateways(token);
CREATE INDEX IF NOT EXISTS idx_datasources_tenant              ON datasources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scripts_tenant                  ON scripts(tenant_id);

-- +goose Down
DROP TABLE IF EXISTS openapi_share_tokens;
DROP TABLE IF EXISTS scripts;
DROP TABLE IF EXISTS endpoint_call_logs;
DROP TABLE IF EXISTS endpoint_activation_log;
DROP TABLE IF EXISTS endpoint_active_version;
DROP TABLE IF EXISTS endpoint_versions;
DROP TABLE IF EXISTS api_endpoints;
DROP TABLE IF EXISTS api_groups;
DROP TABLE IF EXISTS endpoint_datasource_bindings;
DROP TABLE IF EXISTS project_environments;
DROP TABLE IF EXISTS datasources;
DROP TABLE IF EXISTS project_auth_keys;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS gateways;
DROP TABLE IF EXISTS tenant_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
