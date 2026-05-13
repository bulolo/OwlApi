# 系统架构

OwlApi 采用 **云端控制面 (Control Plane)** + **网关执行器 (Gateway)** 的分布式架构。

## 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OwlApi Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │   Admin 控制台  │    │  Control Plane  │    │   PostgreSQL   │  │
│  │   (Next.js)     │◄──►│   (Go + Gin)    │◄──►│   :5432        │  │
│  │   :8001         │    │  HTTP  :3000    │    └────────────────┘  │
│  └─────────────────┘    │  gRPC  :9090    │                        │
│                         └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │ gRPC 双向流 (HTTP/2)
                                   │ Gateway 主动连接，反向隧道
         ┌────────────────────────┬┴────────────────────────┐
         ▼                        ▼                         ▼
┌─────────────────┐    ┌─────────────────┐      ┌─────────────────┐
│ Gateway          │    │ Gateway          │      │ Gateway          │
│  (公司 IDC)      │    │  (阿里云 ECS)    │      │  (树莓派)        │
│  MySQL / MSSQL   │    │  PostgreSQL      │      │  StarRocks / SQLite│
└─────────────────┘    └─────────────────┘      └─────────────────┘
```

## Control Plane（控制面）

部署在云端的核心服务（`backend/cmd/server/`），提供 HTTP API 和 gRPC 服务：

### 内部分层

```
cmd/server/main.go              # 入口：初始化 DB → Service → Handler → 启动
internal/
├── config/
│   ├── ServerConfig            # HTTP/gRPC 端口、DB、JWT、CORS、超时
│   └── GatewayConfig           # Gateway URL、ID、Token、超时
├── domain/
│   ├── 实体定义                 # Tenant, User, Project, DataSource, ...
│   └── Repository 接口          # 全部为 verb-first 命名（Create / GetByID / List ...）
├── service/                    # 业务逻辑层（接口与实现分离）
│   ├── AuthService             # 注册、登录、JWT 签发
│   ├── AuthorizationService    # 租户角色鉴权（提取自 transport 层）
│   ├── TenantService           # 租户 CRUD
│   ├── TenantUserService       # 租户用户管理
│   ├── GatewayAdminService     # Gateway CRUD 管理
│   ├── GatewayBroker           # Gateway 流注册、心跳、查询分发
│   ├── DataSourceService       # 数据源 CRUD + 环境配置
│   ├── ProjectService          # 项目 CRUD
│   ├── APIEndpointService      # 接口定义 CRUD、路径匹配
│   ├── EndpointReleaseService  # 接口发布、激活、回滚
│   ├── APIGroupService         # 接口分组 CRUD
│   ├── ScriptService           # JS 脚本 CRUD
│   ├── QueryService            # 查询调度（分发至 Gateway）
│   └── PlatformSettingsService # 平台全局设置
├── repo/postgres/              # PostgreSQL 实现（pgx driver）
│   └── migrations/             # goose 迁移文件（embedded 到二进制）
├── transport/
│   ├── http/                   # Gin Handler + 中间件 + Swagger + DTO
│   └── grpc/                   # gRPC 双向流 Handler（Gateway 连接）
├── gateway/                    # Gateway 执行器逻辑（仅 Gateway 进程使用）
│   ├── app.go                  # Gateway 主循环（连接、注册、心跳）
│   └── executor.go             # SQL 执行器 + JS 脚本执行
├── pb/                         # Protobuf 生成代码
└── pkg/
    ├── auth/                   # JWT 签发与验证
    ├── logger/                 # slog 封装
    └── pathutil/               # URL 路径模式匹配
```

### HTTP 路由分层

| 权限层 | 路由前缀 | 中间件 |
| :--- | :--- | :--- |
| 公开 | `/v1/auth/*`, `/v1/platform/settings (GET)` | 无 |
| 已登录 | `/v1/my/tenants` | `JWTAuth()` |
| Viewer+ | `/v1/tenants/:slug/...` | `JWTAuth` + `RequireTenantRole(Viewer)` |
| Admin+ | `/v1/tenants/:slug/...` | `JWTAuth` + `RequireTenantRole(Admin)` |
| SuperAdmin | `/v1/tenants (CRUD)`, `/v1/platform/settings (PUT)` | `JWTAuth` + `RequireSuperAdmin()` |
| 查询网关 | `/:tenantSlug/:projectSlug/*path` | 无（使用已发布版本快照） |

## Gateway（网关执行器）

部署在用户内网的轻量级代理（`backend/cmd/gateway/`）：

- **反向隧道** — 通过 gRPC 双向流主动连接 Control Plane，无需开放公网端口
- **SQL 执行** — 接收 `ExecuteQueryRequest`（含 DSN、SQL、参数、超时），执行查询，返回 JSON
- **JS 脚本** — 支持前置脚本（修改参数）和后置脚本（转换结果），在 Goja 运行时执行
- **驱动解析** — 优先使用 `db_type` 字段确定数据库驱动，兜底使用 DSN 前缀推断
- **心跳上报** — 定期上报 CPU、内存、活跃连接数等系统指标
- **安全隔离** — 数据库 DSN 仅存在于 Gateway 侧，Control Plane 仅传递 DSN 串，不存储凭据

## 数据流

### 接口调用流程

```
外部客户端
  │  HTTP  /{tenant-slug}/{project-slug}/{path}
  ▼
Control Plane（匹配已发布接口快照）
  │  gRPC ExecuteQueryRequest { dsn, db_type, sql, params, pre_script, post_script }
  ▼
Gateway（执行前置脚本 → SQL → 后置脚本）
  │  gRPC QueryResult { data: JSON bytes }
  ▼
Control Plane（透传响应）
  │  HTTP 200 application/json
  ▼
外部客户端
```

### 版本发布流程

```
编辑接口（draft）→ 发布（创建 Release 快照）→ 激活（设置 published_release_id）
                                                       ↓
                                          接口状态变更为 "published"
                                          调用时使用 Release.Snapshot（不受后续编辑影响）
```

## 通信协议

| 层级 | 技术 |
| :--- | :--- |
| Control Plane HTTP | Gin over HTTP/1.1，JSON 响应 |
| Control Plane ↔ Gateway | gRPC over HTTP/2，Protocol Buffers v3 |
| 查询结果载荷 | JSON bytes（QueryResult.data） |
| HTTP 认证 | JWT Bearer Token |
| Gateway 认证 | GatewayToken（注册时验证） |
| 请求追踪 | `X-Request-ID` 响应头（服务端生成 UUID） |

## 数据库设计

所有多租户数据表通过 `tenant_id` 列隔离，无跨租户外键。主要表结构：

| 表 | 主键 | 说明 |
| :--- | :--- | :--- |
| `tenants` | `id` | 租户 |
| `users` | `id` | 用户（全局，email 唯一） |
| `tenant_users` | `(tenant_id, user_id)` | 租户成员与角色 |
| `gateways` | `id` | Gateway 节点 |
| `projects` | `(tenant_id, id)` | 项目（含 slug 唯一约束） |
| `datasources` | `(tenant_id, id)` | 数据源 |
| `datasource_envs` | `id` | 数据源环境配置（prod/test + DSN） |
| `api_groups` | `(tenant_id, id)` | 接口分组 |
| `api_endpoints` | `(tenant_id, id)` | 接口定义 |
| `endpoint_releases` | `(tenant_id, id)` | 接口发布版本快照 |
| `scripts` | `id` | JS 脚本 |
| `platform_settings` | `id=1` | 平台全局配置（单行） |
