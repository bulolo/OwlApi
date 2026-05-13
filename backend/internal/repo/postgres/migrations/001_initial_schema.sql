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
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
-- +goose StatementEnd
COMMENT ON TABLE tenants IS '租户';
COMMENT ON COLUMN tenants.id                   IS '租户ID';
COMMENT ON COLUMN tenants.name                 IS '租户名称';
COMMENT ON COLUMN tenants.slug                 IS 'URL标识符，全局唯一';
COMMENT ON COLUMN tenants.plan                 IS '订阅计划：Free / Pro / Enterprise';
COMMENT ON COLUMN tenants.status               IS '状态：Active / Warning / Suspended';
COMMENT ON COLUMN tenants.max_release_versions IS '每个接口最大保留发版数，0 表示不限制';
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
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
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
    joined_at TIMESTAMPTZ DEFAULT NOW(),
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
    last_seen   TIMESTAMPTZ DEFAULT NOW(),
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
    description TEXT DEFAULT '',
    avatar      TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
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
CREATE TABLE IF NOT EXISTS datasources (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    name        TEXT NOT NULL,
    is_dual     BOOLEAN NOT NULL DEFAULT FALSE,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    type        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd
COMMENT ON TABLE datasources IS '数据源';
COMMENT ON COLUMN datasources.id          IS '数据源ID';
COMMENT ON COLUMN datasources.tenant_id   IS '所属租户ID（外键 → tenants.id）';
COMMENT ON COLUMN datasources.name        IS '数据源名称';
COMMENT ON COLUMN datasources.is_dual     IS '是否双环境（dev/prod 各一个连接串）';
COMMENT ON COLUMN datasources.is_platform IS '是否为平台内置数据源';
COMMENT ON COLUMN datasources.type        IS '数据库类型：mysql / postgres / sqlserver / sqlite 等';
COMMENT ON COLUMN datasources.created_at  IS '创建时间';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS datasource_envs (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     BIGINT NOT NULL,
    datasource_id BIGINT NOT NULL,
    env           TEXT NOT NULL DEFAULT 'prod',
    dsn           TEXT NOT NULL,
    gateway_id    BIGINT NOT NULL,
    UNIQUE (tenant_id, datasource_id, env)
);
-- +goose StatementEnd
COMMENT ON TABLE datasource_envs IS '数据源环境配置';
COMMENT ON COLUMN datasource_envs.id            IS '环境配置ID';
COMMENT ON COLUMN datasource_envs.tenant_id     IS '所属租户ID';
COMMENT ON COLUMN datasource_envs.datasource_id IS '所属数据源ID';
COMMENT ON COLUMN datasource_envs.env           IS '环境标识：prod / dev';
COMMENT ON COLUMN datasource_envs.dsn           IS '数据库连接串（DSN）';
COMMENT ON COLUMN datasource_envs.gateway_id    IS '通过哪个网关节点连接（外键 → gateways.id）';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS api_groups (
    id          BIGSERIAL NOT NULL,
    tenant_id   BIGINT NOT NULL,
    project_id  BIGINT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
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
CREATE TABLE IF NOT EXISTS api_endpoints (
    id                   BIGSERIAL NOT NULL,
    tenant_id            BIGINT NOT NULL,
    project_id           BIGINT NOT NULL,
    group_id             BIGINT NOT NULL DEFAULT 0,
    datasource_id        BIGINT NOT NULL DEFAULT 0,
    path                 TEXT NOT NULL,
    methods              TEXT[] NOT NULL,
    summary              TEXT NOT NULL DEFAULT '',
    description          TEXT NOT NULL DEFAULT '',
    sql_query            TEXT NOT NULL,
    params               TEXT[] DEFAULT '{}',
    param_defs           JSONB DEFAULT '[]',
    pre_script_id        BIGINT NOT NULL DEFAULT 0,
    post_script_id       BIGINT NOT NULL DEFAULT 0,
    status               TEXT NOT NULL DEFAULT 'draft',
    published_release_id BIGINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, project_id, path, methods)
);
-- +goose StatementEnd
COMMENT ON TABLE api_endpoints IS '接口';
COMMENT ON COLUMN api_endpoints.id                   IS '接口ID';
COMMENT ON COLUMN api_endpoints.tenant_id            IS '所属租户ID';
COMMENT ON COLUMN api_endpoints.project_id           IS '所属项目ID';
COMMENT ON COLUMN api_endpoints.group_id             IS '所属分组ID，0 表示未分组';
COMMENT ON COLUMN api_endpoints.datasource_id        IS '绑定的数据源ID';
COMMENT ON COLUMN api_endpoints.path                 IS '接口路径，如 /users/list';
COMMENT ON COLUMN api_endpoints.methods              IS 'HTTP 方法列表，如 {GET,POST}';
COMMENT ON COLUMN api_endpoints.summary              IS '接口简短描述（用于 OpenAPI）';
COMMENT ON COLUMN api_endpoints.description          IS '接口详细描述';
COMMENT ON COLUMN api_endpoints.sql_query            IS '执行的 SQL 语句';
COMMENT ON COLUMN api_endpoints.params               IS 'SQL 中提取的参数名列表';
COMMENT ON COLUMN api_endpoints.param_defs           IS '参数定义（类型、是否必填、默认值等）';
COMMENT ON COLUMN api_endpoints.pre_script_id        IS '前置脚本ID，0 表示不挂载';
COMMENT ON COLUMN api_endpoints.post_script_id       IS '后置脚本ID，0 表示不挂载';
COMMENT ON COLUMN api_endpoints.status               IS '发布状态：draft / published';
COMMENT ON COLUMN api_endpoints.published_release_id IS '当前生效的发版记录ID';
COMMENT ON COLUMN api_endpoints.created_at           IS '创建时间';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS endpoint_releases (
    id           BIGSERIAL NOT NULL,
    tenant_id    BIGINT NOT NULL,
    endpoint_id  BIGINT NOT NULL,
    version      INT NOT NULL DEFAULT 1,
    note         TEXT NOT NULL DEFAULT '',
    snapshot     JSONB NOT NULL DEFAULT '{}',
    published_by BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    is_active    BOOLEAN NOT NULL DEFAULT FALSE,
    is_draft     BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (tenant_id, id)
);
-- +goose StatementEnd
COMMENT ON TABLE endpoint_releases IS '接口发版记录';
COMMENT ON COLUMN endpoint_releases.id           IS '发版记录ID';
COMMENT ON COLUMN endpoint_releases.tenant_id    IS '所属租户ID';
COMMENT ON COLUMN endpoint_releases.endpoint_id  IS '所属接口ID';
COMMENT ON COLUMN endpoint_releases.version      IS '版本号，自增整数';
COMMENT ON COLUMN endpoint_releases.note         IS '发版说明';
COMMENT ON COLUMN endpoint_releases.snapshot     IS '发版时接口配置快照';
COMMENT ON COLUMN endpoint_releases.published_by IS '发版人用户ID';
COMMENT ON COLUMN endpoint_releases.published_at IS '发版时间';
COMMENT ON COLUMN endpoint_releases.is_active    IS '是否为当前生效版本';
COMMENT ON COLUMN endpoint_releases.is_draft     IS '是否为草稿（未正式上线）';

-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS scripts (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT,
    is_platform BOOLEAN NOT NULL DEFAULT FALSE,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'pre',
    code        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
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
COMMENT ON COLUMN platform_settings.allow_self_register IS '是否允许开放注册（登录页显示「申请注册」入口）';

-- +goose StatementBegin
INSERT INTO platform_settings (id, allow_self_register) VALUES (1, false) ON CONFLICT DO NOTHING;
-- +goose StatementEnd

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id        ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_datasource_envs_lookup      ON datasource_envs(tenant_id, datasource_id, env);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_project       ON api_endpoints(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_endpoint_releases_endpoint  ON endpoint_releases(tenant_id, endpoint_id);
CREATE INDEX IF NOT EXISTS idx_gateways_token              ON gateways(token);
CREATE INDEX IF NOT EXISTS idx_datasources_tenant          ON datasources(tenant_id);

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
