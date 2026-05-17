# 后端开发

本文档提供后端开发的详细指南。

## 🏗️ 技术栈

- **框架**: Gin (Go 1.23+)
- **数据库**: PostgreSQL + pgx 驱动
- **迁移工具**: goose（迁移文件 embedded 到二进制，随服务启动自动执行）
- **通信协议**: HTTP/1.1 (REST + Swagger) + gRPC over HTTP/2 (Protobuf v3)
- **JS 运行时**: Goja（在 Gateway 侧执行前置/后置脚本）
- **身份认证**: JWT (HS256)
- **包管理**: Go Modules

---

## 📁 项目结构

```
backend/
├── cmd/
│   ├── server/          # Control Plane 服务入口（HTTP + gRPC）
│   ├── gateway/         # Gateway 代理入口（gRPC 反向隧道）
│   └── init/            # 数据库初始化 & 迁移
├── internal/
│   ├── config/          # 环境变量配置（ServerConfig / GatewayConfig）
│   ├── domain/          # 核心实体与 Repository 接口（verb-first 命名）
│   ├── service/         # 业务逻辑层（接口与实现分离，共 14 个 Service）
│   ├── repo/postgres/   # PostgreSQL 持久层
│   │   └── migrations/  # goose 迁移文件（embedded 到二进制）
│   ├── transport/
│   │   ├── http/        # Gin Handler、中间件、Swagger DTO
│   │   └── grpc/        # gRPC 双向流 Handler（Gateway 连接）
│   ├── gateway/         # Gateway 执行器（SQL 查询、JS 脚本）
│   ├── pb/              # Protobuf 生成代码（勿手动修改）
│   └── pkg/             # 通用工具（JWT、Logger、PathUtil）
└── proto/               # Protobuf 定义（gateway.proto）
```

---

## 🚀 快速开始

### 环境初始化

在项目根目录下执行：
```bash
make dev-init
```

### 开发模式启动（Docker）

推荐使用 Docker 快速启动全栈环境：
```bash
# 启动所有服务（后端、前端、数据库）
make dev-up
```

访问地址：

| 服务 | 地址 |
|------|------|
| API 服务 | http://localhost:3000 |
| Swagger 文档 | http://localhost:3000/swagger/index.html |
| gRPC | localhost:9090 |
| PostgreSQL | localhost:5433 |

### 本地原生启动

如果需要直接在主机上调试后端，确保本地已安装 Go 1.23+：
```bash
cd backend

# 确认 backend/.env 已存在（make dev-init 会生成）
go run ./cmd/server/main.go
```

---

## 📝 常用开发命令

### 1. 数据库管理

- **进入 psql**: `make dev-db-psql`
- **重置数据库**: `make dev-clean`（停止容器并删除数据卷，有二次确认）

> 迁移文件在 `internal/repo/postgres/migrations/`，goose 格式，服务启动时自动执行。

### 2. 代码生成

- **生成 Swagger**: `make gen-swagger`（更新 `backend/docs/swagger.json`）
- **生成 gRPC 代码**: `make gen-proto`（修改 `proto/gateway.proto` 后必跑）
- **生成前端 SDK**: `make gen-sdk`（包含 gen-swagger，修改 Handler DTO 后必跑）

### 3. 代码质量

- **格式化**: `make format`（运行 `gofmt -w .`）
- **全量检查**: `make check-all`（gofmt + go vet + Swagger/SDK drift 检测）
- **增量检查**: `make check-changed`（仅已暂存文件，由 pre-commit hook 自动触发）

### 4. CE（社区版）同步

- **同步代码**: `make sync-ce`（从 EE 分支生成过滤后的 CE 版本）
- **发布 GitHub**: `make publish-ce-github`（推送至 GitHub 公开仓库）

---

## 🔐 权限分层

| 层级 | 路由前缀 | 中间件 |
|------|---------|--------|
| 公开 | `/v1/auth/*`, `/v1/platform/settings` (GET) | 无 |
| 已登录 | `/v1/my/tenants` | `JWTAuth()` |
| Viewer+ | `/v1/tenants/:slug/...` | `JWTAuth` + `RequireTenantRole(Viewer)` |
| Admin+ | `/v1/tenants/:slug/...` | `JWTAuth` + `RequireTenantRole(Admin)` |
| SuperAdmin | `/v1/tenants` (CRUD), `/v1/platform/settings` (PUT) | `JWTAuth` + `RequireSuperAdmin()` |
| 查询网关 | `/:tenantSlug/:projectSlug/*path` | 无（使用已发布版本快照） |

---

## 📚 相关文档

- [系统架构](/guide/architecture)
- [前端开发指南](/guide/frontend)
- [REST API 参考](/api/rest)
- [gRPC 协议](/api/grpc)
- [环境变量配置](/api/config)
