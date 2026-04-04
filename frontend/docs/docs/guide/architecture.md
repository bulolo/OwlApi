# 系统架构

OwlApi 采用 **云端控制面 (Control Plane)** + **网关执行器 (Gateway Runner)** 的分布式架构。

## 总体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OwlApi Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │   Frontend      │    │  Control Plane  │    │   Database     │  │
│  │   (Next.js)     │◄──►│   (Go + Gin)    │◄──►│  (PostgreSQL)  │  │
│  │   :8000         │    │  HTTP :3000     │    │   :5432        │  │
│  └─────────────────┘    │  gRPC :9090     │    └────────────────┘  │
│                         └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                    │ gRPC 双向流 (HTTP/2)
                                    │ Gateway Runner 主动连接
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Gateway Runner  │      │ Gateway Runner  │      │ Gateway Runner  │
│   (公司 IDC)    │      │  (阿里云 ECS)   │      │   (树莓派)      │
│  MySQL / Oracle │      │  PostgreSQL     │      │  SQLite         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Control Plane (控制面)

部署在云端的核心服务（`backend/cmd/server/`），基于 Gin 框架提供 HTTP API：

- **用户认证** — JWT 鉴权，支持注册/登录
- **多租户管理** — 租户 CRUD、用户角色管理（Admin / Viewer）
- **权限控制** — SuperAdmin 全局管理，租户级 RBAC
- **API 定义** — SQL 查询管理、参数映射（规划中）
- **Gateway Runner 管理** — 注册、心跳监控、状态同步（规划中）

### 内部分层

```
cmd/server/main.go          # 入口：初始化 DB → Service → Handler → 启动 HTTP
internal/
├── config/                  # 环境变量加载 (Config struct)
├── domain/                  # 实体定义 + Repository 接口
├── service/                 # 业务逻辑 (AuthService, TenantService, TenantUserService)
├── repo/postgres/           # PostgreSQL 实现 (pgx driver)
├── transport/http/          # Gin Handler + JWT 中间件 + Swagger
└── pkg/                     # auth(JWT), logger, core(errors)
```

## Gateway Runner (网关执行器)

部署在用户内网的轻量级代理：

- **反向隧道** — 通过 gRPC 双向流主动连接 Control Plane，无需公网 IP
- **数据库执行** — 接收 SQL 指令，执行查询，返回 JSON 结果
- **安全隔离** — 敏感数据不出内网，仅传输查询结果
- **心跳上报** — 定期上报 CPU、内存、连接数等系统指标

## 数据流

```
用户请求 → Control Plane (HTTP) → gRPC Stream → Gateway Runner → 内网数据库
                ↑                                      │
                └──────────── 查询结果 (JSON) ◄────────┘
```

## 通信协议

| 层级 | 技术 |
| :--- | :--- |
| Transport | gRPC over HTTP/2 |
| Serialization | Protocol Buffers v3 |
| 业务载荷 | JSON (QueryResult.data) |
| 认证 | JWT (HTTP API), Token (Gateway Runner 注册) |
