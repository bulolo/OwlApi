-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS tenants (
    id                   BIGSERIAL PRIMARY KEY,
    name                 TEXT NOT NULL,
    slug                 TEXT NOT NULL UNIQUE,
    plan                 TEXT NOT NULL DEFAULT 'Free',
    status               TEXT NOT NULL DEFAULT 'Active',
    max_release_versions INT  NOT NULL DEFAULT 5,
    avatar               TEXT NOT NULL DEFAULT '',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE tenants IS '租户';
COMMENT ON COLUMN tenants.id                   IS '租户ID';
COMMENT ON COLUMN tenants.name                 IS '租户名称';
COMMENT ON COLUMN tenants.slug                 IS 'URL标识符，全局唯一';
COMMENT ON COLUMN tenants.plan                 IS '订阅计划：Free / Pro / Enterprise';
COMMENT ON COLUMN tenants.status               IS '状态：Active / Warning / Suspended';
COMMENT ON COLUMN tenants.max_release_versions IS '每个接口最大保留版本数，0 表示不限制';
COMMENT ON COLUMN tenants.avatar               IS '头像/Logo URL';
COMMENT ON COLUMN tenants.created_at           IS '创建时间';
COMMENT ON COLUMN tenants.updated_at           IS '最后更新时间';

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
COMMENT ON COLUMN users.id            IS '用户ID';
COMMENT ON COLUMN users.email         IS '登录邮箱，全局唯一';
COMMENT ON COLUMN users.name          IS '显示名称';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 密码哈希';
COMMENT ON COLUMN users.is_superadmin IS '是否为超级管理员';
COMMENT ON COLUMN users.created_at    IS '创建时间';
COMMENT ON COLUMN users.updated_at    IS '最后更新时间';

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
COMMENT ON COLUMN tenant_users.tenant_id IS '租户ID（外键 → tenants.id）';
COMMENT ON COLUMN tenant_users.user_id   IS '用户ID（外键 → users.id）';
COMMENT ON COLUMN tenant_users.role      IS '角色：Admin / Editor / Viewer';
COMMENT ON COLUMN tenant_users.joined_at IS '加入时间';

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
COMMENT ON TABLE gateways IS '网关节点';
COMMENT ON COLUMN gateways.id          IS '网关节点ID';
COMMENT ON COLUMN gateways.tenant_id   IS '所属租户ID，NULL 表示平台级网关';
COMMENT ON COLUMN gateways.is_platform IS '是否为平台公共网关';
COMMENT ON COLUMN gateways.name        IS '节点名称';
COMMENT ON COLUMN gateways.token       IS '注册令牌，用于网关身份认证';
COMMENT ON COLUMN gateways.status      IS '在线状态：online / offline';
COMMENT ON COLUMN gateways.ip          IS '节点最近上报的 IP 地址';
COMMENT ON COLUMN gateways.last_seen   IS '最后心跳时间';
COMMENT ON COLUMN gateways.version     IS '网关客户端版本号';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS projects (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    avatar      TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, slug)
);
-- +goose StatementEnd
COMMENT ON TABLE projects IS '项目';
COMMENT ON COLUMN projects.id          IS '项目ID';
COMMENT ON COLUMN projects.tenant_id   IS '所属租户ID（外键 → tenants.id）';
COMMENT ON COLUMN projects.slug        IS '项目URL标识符，租户内唯一';
COMMENT ON COLUMN projects.name        IS '项目名称';
COMMENT ON COLUMN projects.description IS '项目描述';
COMMENT ON COLUMN projects.avatar      IS '项目头像/封面 URL';
COMMENT ON COLUMN projects.created_at  IS '创建时间';

-- +goose StatementBegin
-- datasources 表 = 物理数据库连接 (单一连接，无 env 概念)。
-- "环境" 概念上移到 project_environments；同一份逻辑数据在 dev/prod 各自是一个独立的 datasource 行。
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
COMMENT ON COLUMN datasources.id          IS '数据源ID';
COMMENT ON COLUMN datasources.tenant_id   IS '所属租户ID';
COMMENT ON COLUMN datasources.name        IS '数据源名称（租户内唯一）';
COMMENT ON COLUMN datasources.is_platform IS '是否为平台内置数据源';
COMMENT ON COLUMN datasources.type        IS '数据库类型：mysql / postgres / sqlserver / sqlite 等';
COMMENT ON COLUMN datasources.dsn         IS '数据库连接串（DSN）';
COMMENT ON COLUMN datasources.gateway_id  IS '通过哪个网关节点连接（外键 → gateways.id）';
COMMENT ON COLUMN datasources.created_at  IS '创建时间';

-- +goose StatementBegin
-- project_environments 表 = 项目层"环境"实体；每项目至少一行 (默认 prod)。
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
COMMENT ON TABLE project_environments IS '项目环境（dev / staging / prod / 任意命名）';
COMMENT ON COLUMN project_environments.id         IS '环境ID';
COMMENT ON COLUMN project_environments.tenant_id  IS '所属租户ID';
COMMENT ON COLUMN project_environments.project_id IS '所属项目ID';
COMMENT ON COLUMN project_environments.name       IS '环境名（项目内唯一）';
COMMENT ON COLUMN project_environments.is_default IS '是否为默认环境（每项目应有且仅有一行 true）';
COMMENT ON COLUMN project_environments.created_at IS '创建时间';

-- +goose StatementBegin
-- endpoint_datasource_bindings 表 = 在某 env 里, 一个数据源别名映射到哪个物理 datasource。
-- alias 是项目级共享的"逻辑数据源名"，endpoint 通过 alias 引用而非直接 datasource_id。
CREATE TABLE IF NOT EXISTS endpoint_datasource_bindings (
    tenant_id     BIGINT NOT NULL,
    env_id        BIGINT NOT NULL,
    alias         TEXT NOT NULL,
    datasource_id BIGINT NOT NULL,
    PRIMARY KEY (tenant_id, env_id, alias)
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_datasource_bindings IS '环境内 alias → datasource 绑定';
COMMENT ON COLUMN endpoint_datasource_bindings.tenant_id     IS '所属租户ID';
COMMENT ON COLUMN endpoint_datasource_bindings.env_id        IS '所属环境ID（外键 → project_environments.id）';
COMMENT ON COLUMN endpoint_datasource_bindings.alias         IS '数据源别名（endpoint 引用此名，env 内决定指向哪个物理库）';
COMMENT ON COLUMN endpoint_datasource_bindings.datasource_id IS '该 env 下 alias 实际指向的物理 datasource';

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
COMMENT ON COLUMN api_groups.id          IS '分组ID';
COMMENT ON COLUMN api_groups.tenant_id   IS '所属租户ID';
COMMENT ON COLUMN api_groups.project_id  IS '所属项目ID';
COMMENT ON COLUMN api_groups.name        IS '分组名称';
COMMENT ON COLUMN api_groups.description IS '分组描述';
COMMENT ON COLUMN api_groups.created_at  IS '创建时间';

-- +goose StatementBegin
-- api_endpoints 表 = "草稿/工作区"：用户编辑直接改这里，永远是最新状态。
-- 线上跑的是哪个版本由 endpoint_active_version 决定，与此表解耦。
-- 数据源以 alias 名引用，运行时按 (env, alias) 查 endpoint_datasource_bindings 解析。
CREATE TABLE IF NOT EXISTS api_endpoints (
    id                BIGSERIAL NOT NULL,
    tenant_id         BIGINT NOT NULL,
    project_id        BIGINT NOT NULL,
    group_id          BIGINT NOT NULL DEFAULT 0,
    datasource_alias TEXT NOT NULL DEFAULT '',
    path              TEXT NOT NULL,
    methods           TEXT[] NOT NULL,
    summary           TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    sql_query         TEXT NOT NULL,
    params            TEXT[] DEFAULT '{}',
    param_defs        JSONB DEFAULT '[]',
    pre_script_id     BIGINT NOT NULL DEFAULT 0,
    post_script_id    BIGINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, project_id, path, methods)
);
-- +goose StatementEnd
COMMENT ON TABLE api_endpoints IS '接口（工作区/草稿；永远代表当前编辑中的状态）';
COMMENT ON COLUMN api_endpoints.id                IS '接口ID';
COMMENT ON COLUMN api_endpoints.tenant_id         IS '所属租户ID';
COMMENT ON COLUMN api_endpoints.project_id        IS '所属项目ID';
COMMENT ON COLUMN api_endpoints.group_id          IS '所属分组ID，0 表示未分组';
COMMENT ON COLUMN api_endpoints.datasource_alias IS '引用的数据源别名（在 env 内解析为具体 datasource）';
COMMENT ON COLUMN api_endpoints.path              IS '接口路径，如 /users/list';
COMMENT ON COLUMN api_endpoints.methods           IS 'HTTP 方法列表，如 {GET,POST}';
COMMENT ON COLUMN api_endpoints.summary           IS '接口简短描述（用于 OpenAPI）';
COMMENT ON COLUMN api_endpoints.description       IS '接口详细描述';
COMMENT ON COLUMN api_endpoints.sql_query         IS '执行的 SQL 语句';
COMMENT ON COLUMN api_endpoints.params            IS 'SQL 中提取的参数名列表';
COMMENT ON COLUMN api_endpoints.param_defs        IS '参数定义（类型、是否必填、默认值等）';
COMMENT ON COLUMN api_endpoints.pre_script_id     IS '前置脚本ID，0 表示不挂载';
COMMENT ON COLUMN api_endpoints.post_script_id    IS '后置脚本ID，0 表示不挂载';
COMMENT ON COLUMN api_endpoints.created_at        IS '创建时间';
COMMENT ON COLUMN api_endpoints.updated_at        IS '最后修改时间';

-- +goose StatementBegin
-- endpoint_versions 表 = 不可变历史快照（version 跨 env 共享）。
CREATE TABLE IF NOT EXISTS endpoint_versions (
    id                   BIGSERIAL NOT NULL,
    tenant_id            BIGINT NOT NULL,
    endpoint_id          BIGINT NOT NULL,
    version              INT NOT NULL,
    snapshot             JSONB NOT NULL,
    snapshot_v           INT NOT NULL DEFAULT 1,
    pre_script_snapshot  JSONB,
    post_script_snapshot JSONB,
    datasource_ref       JSONB,
    note                 TEXT NOT NULL DEFAULT '',
    created_by           BIGINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, endpoint_id, version)
);
-- +goose StatementEnd
COMMENT ON TABLE  endpoint_versions IS '接口版本快照（不可变，跨 env 共享）';
COMMENT ON COLUMN endpoint_versions.id                   IS '版本记录ID';
COMMENT ON COLUMN endpoint_versions.tenant_id            IS '所属租户ID';
COMMENT ON COLUMN endpoint_versions.endpoint_id          IS '所属接口ID';
COMMENT ON COLUMN endpoint_versions.version              IS '版本号（per endpoint 自增，从 1 起）';
COMMENT ON COLUMN endpoint_versions.snapshot             IS 'APIEndpoint 完整 JSON 快照';
COMMENT ON COLUMN endpoint_versions.snapshot_v           IS '快照 schema 版本';
COMMENT ON COLUMN endpoint_versions.pre_script_snapshot  IS '前置脚本快照 {id,name,type,code}';
COMMENT ON COLUMN endpoint_versions.post_script_snapshot IS '后置脚本快照 {id,name,type,code}';
COMMENT ON COLUMN endpoint_versions.datasource_ref       IS '数据源引用 {alias}（运行时按 env 解析具体 datasource）';
COMMENT ON COLUMN endpoint_versions.note                 IS '版本说明 / changelog';
COMMENT ON COLUMN endpoint_versions.created_by           IS '创建该版本的用户ID';
COMMENT ON COLUMN endpoint_versions.created_at           IS '版本创建时间';

-- +goose StatementBegin
-- endpoint_active_version 表 = 单一权威指针，标识 "某 env 当前跑的是哪个版本"。
-- PK (tenant_id, endpoint_id, env_id) 保证一个接口在一个 env 内至多一个 active 版本；
-- 不同 env 可同时跑不同版本（例如 dev=v5, prod=v3，灰度/promote 流程的基础）。
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
COMMENT ON TABLE  endpoint_active_version IS '某 env 内接口当前生效版本指针';
COMMENT ON COLUMN endpoint_active_version.tenant_id    IS '所属租户ID';
COMMENT ON COLUMN endpoint_active_version.endpoint_id  IS '接口ID';
COMMENT ON COLUMN endpoint_active_version.env_id       IS '环境ID';
COMMENT ON COLUMN endpoint_active_version.version_id   IS '当前生效版本ID（外键 → endpoint_versions.id）';
COMMENT ON COLUMN endpoint_active_version.activated_by IS '执行激活/发布操作的用户ID';
COMMENT ON COLUMN endpoint_active_version.activated_at IS '激活时间';

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
COMMENT ON TABLE  endpoint_activation_log IS '接口激活/下线/回滚操作流水';
COMMENT ON COLUMN endpoint_activation_log.id          IS '流水ID';
COMMENT ON COLUMN endpoint_activation_log.tenant_id   IS '所属租户ID';
COMMENT ON COLUMN endpoint_activation_log.endpoint_id IS '接口ID';
COMMENT ON COLUMN endpoint_activation_log.env_id      IS '操作发生的环境ID（无 env 上下文时 NULL）';
COMMENT ON COLUMN endpoint_activation_log.version_id  IS '相关版本ID';
COMMENT ON COLUMN endpoint_activation_log.version     IS '相关版本号（冗余，便于版本被删后仍可还原 vN）';
COMMENT ON COLUMN endpoint_activation_log.action      IS '操作类型：publish / activate / rollback / unpublish / version_deleted / promote / revert';
COMMENT ON COLUMN endpoint_activation_log.actor_id    IS '操作人用户ID';
COMMENT ON COLUMN endpoint_activation_log.at          IS '操作时间';

-- +goose StatementBegin
-- endpoint_call_logs 表 = 每次调用通过 /-/:env/:tenantSlug/:projectSlug/:path 进来的请求流水。
CREATE TABLE IF NOT EXISTS endpoint_call_logs (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL,
    endpoint_id BIGINT NOT NULL,
    env_id      BIGINT,
    version_id  BIGINT,
    version     INT,
    method      TEXT NOT NULL,
    path        TEXT NOT NULL,
    params      JSONB,
    status      INT NOT NULL,
    latency_ms  INT NOT NULL DEFAULT 0,
    error       TEXT NOT NULL DEFAULT '',
    ip          TEXT NOT NULL DEFAULT '',
    user_agent  TEXT NOT NULL DEFAULT '',
    at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE  endpoint_call_logs IS '接口调用流水（按 env 区分）';
COMMENT ON COLUMN endpoint_call_logs.id          IS '流水ID';
COMMENT ON COLUMN endpoint_call_logs.tenant_id   IS '所属租户ID';
COMMENT ON COLUMN endpoint_call_logs.endpoint_id IS '接口ID';
COMMENT ON COLUMN endpoint_call_logs.env_id      IS '调用环境ID';
COMMENT ON COLUMN endpoint_call_logs.version_id  IS '调用时跑的版本ID';
COMMENT ON COLUMN endpoint_call_logs.version     IS '调用时版本号（冗余）';
COMMENT ON COLUMN endpoint_call_logs.method      IS '实际请求方法 GET / POST / ...';
COMMENT ON COLUMN endpoint_call_logs.path        IS '实际请求路径（path 参数已展开）';
COMMENT ON COLUMN endpoint_call_logs.params      IS '实际入参 JSON';
COMMENT ON COLUMN endpoint_call_logs.status      IS 'HTTP 状态码';
COMMENT ON COLUMN endpoint_call_logs.latency_ms  IS '处理耗时（毫秒）';
COMMENT ON COLUMN endpoint_call_logs.error       IS '错误信息';
COMMENT ON COLUMN endpoint_call_logs.ip          IS '调用方 IP';
COMMENT ON COLUMN endpoint_call_logs.user_agent  IS '调用方 User-Agent';
COMMENT ON COLUMN endpoint_call_logs.at          IS '请求时间';

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
COMMENT ON TABLE scripts IS '脚本库';
COMMENT ON COLUMN scripts.id          IS '脚本ID';
COMMENT ON COLUMN scripts.tenant_id   IS '所属租户ID，NULL 表示平台内置脚本';
COMMENT ON COLUMN scripts.is_platform IS '是否为平台内置脚本';
COMMENT ON COLUMN scripts.name        IS '脚本名称';
COMMENT ON COLUMN scripts.type        IS '脚本类型：pre（前置）/ post（后置）';
COMMENT ON COLUMN scripts.code        IS 'JavaScript 脚本内容';
COMMENT ON COLUMN scripts.description IS '脚本描述';
COMMENT ON COLUMN scripts.created_at  IS '创建时间';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS platform_settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    allow_self_register BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (id = 1)
);
-- +goose StatementEnd
COMMENT ON TABLE platform_settings IS '平台全局配置（单行表）';
COMMENT ON COLUMN platform_settings.id                  IS '固定 id=1';
COMMENT ON COLUMN platform_settings.allow_self_register IS '是否允许开放注册';

-- +goose StatementBegin
INSERT INTO platform_settings (id, allow_self_register) VALUES (1, false) ON CONFLICT DO NOTHING;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id            ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_project_environments_lookup     ON project_environments(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_bindings_env           ON endpoint_datasource_bindings(tenant_id, env_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project           ON api_endpoints(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_api_groups_project              ON api_groups(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_versions_endpoint      ON endpoint_versions(tenant_id, endpoint_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_active_version_env     ON endpoint_active_version(tenant_id, env_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_activation_log_lookup  ON endpoint_activation_log(tenant_id, endpoint_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_lookup       ON endpoint_call_logs(tenant_id, endpoint_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_env          ON endpoint_call_logs(tenant_id, endpoint_id, env_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_call_logs_status       ON endpoint_call_logs(tenant_id, endpoint_id, status, at DESC);
CREATE INDEX IF NOT EXISTS idx_gateways_token                  ON gateways(token);
CREATE INDEX IF NOT EXISTS idx_datasources_tenant              ON datasources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scripts_tenant                  ON scripts(tenant_id);

-- +goose Down
DROP INDEX IF EXISTS idx_tenant_users_user_id;
DROP INDEX IF EXISTS idx_project_environments_lookup;
DROP INDEX IF EXISTS idx_endpoint_bindings_env;
DROP INDEX IF EXISTS idx_api_endpoints_project;
DROP INDEX IF EXISTS idx_api_groups_project;
DROP INDEX IF EXISTS idx_endpoint_versions_endpoint;
DROP INDEX IF EXISTS idx_endpoint_active_version_env;
DROP INDEX IF EXISTS idx_endpoint_activation_log_lookup;
DROP INDEX IF EXISTS idx_endpoint_call_logs_lookup;
DROP INDEX IF EXISTS idx_endpoint_call_logs_env;
DROP INDEX IF EXISTS idx_endpoint_call_logs_status;
DROP INDEX IF EXISTS idx_gateways_token;
DROP INDEX IF EXISTS idx_datasources_tenant;
DROP INDEX IF EXISTS idx_scripts_tenant;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS scripts;
DROP TABLE IF EXISTS endpoint_activation_log;
DROP TABLE IF EXISTS endpoint_call_logs;
DROP TABLE IF EXISTS endpoint_active_version;
DROP TABLE IF EXISTS endpoint_versions;
DROP TABLE IF EXISTS api_endpoints;
DROP TABLE IF EXISTS api_groups;
DROP TABLE IF EXISTS endpoint_datasource_bindings;
DROP TABLE IF EXISTS project_environments;
DROP TABLE IF EXISTS datasources;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS gateways;
DROP TABLE IF EXISTS tenant_users;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
