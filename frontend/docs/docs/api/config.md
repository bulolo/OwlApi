# 环境变量

## Control Plane (Server)

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://postgres:postgres@localhost:5432/owlapi?sslmode=disable` |
| `OWLAPI_HTTP_PORT` | HTTP 监听端口 | `:3000` |
| `OWLAPI_GRPC_PORT` | gRPC 监听端口 | `:9090` |
| `OWLAPI_JWT_SECRET` | JWT 签名密钥 | `owlapi-dev-secret-change-me` |
| `OWLAPI_LOG_LEVEL` | 日志级别 | `info` |
| `OWLAPI_LOG_CONSOLE` | 控制台日志输出 | `true` |

::: warning
生产环境务必修改 `OWLAPI_JWT_SECRET`，不要使用默认值。
:::

## Gateway Runner (网关执行器)

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `OWLAPI_SERVER_URL` | Control Plane gRPC 地址 | `dns:///localhost:9090` |
| `OWLAPI_RUNNER_ID` | 节点 ID | (必填) |
| `OWLAPI_RUNNER_TOKEN` | 节点鉴权令牌 | (必填) |
| `OWLAPI_TENANT_ID` | 归属租户 ID | `default` |
| `OWLAPI_LOG_LEVEL` | 日志级别 | `info` |
| `OWLAPI_LOG_CONSOLE` | 控制台日志输出 | `true` |

## Docker Compose 开发环境

开发环境 (`docker-compose.dev.yml`) 中的默认配置：

| 服务 | 端口 | 说明 |
| :--- | :--- | :--- |
| backend | 3000, 9090 | HTTP API + gRPC |
| frontend | 8000 | Next.js 控制台 |
| docs | 8001 | VitePress 文档站 |
| postgres | 5433 → 5432 | 使用 5433 避免与本地 PostgreSQL 冲突 |

数据库默认凭据：`postgres:postgres`，数据库名：`owlapi`
