# 环境变量

## Control Plane（Server）

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgres://postgres:postgres@localhost:5432/owlapi?sslmode=disable` |
| `OWLAPI_HTTP_PORT` | HTTP 监听端口 | `:3000` |
| `OWLAPI_GRPC_PORT` | gRPC 监听端口 | `:9090` |
| `OWLAPI_JWT_SECRET` | JWT 签名密钥 | `""` |
| `OWLAPI_CORS_ORIGIN` | 允许的 CORS Origin | `*` |
| `OWLAPI_QUERY_TIMEOUT_SECONDS` | 服务端等待 Gateway 查询结果的超时（秒），建议略大于 Gateway 侧超时 | `30` |
| `OWLAPI_LOG_LEVEL` | 日志级别（debug / info / warn / error） | `info` |

::: warning
生产环境务必设置 `OWLAPI_JWT_SECRET`。未设置时服务会使用内置默认值并打印警告日志。
:::

::: tip
`OWLAPI_CORS_ORIGIN` 设置为具体域名（如 `https://admin.example.com`）时，`AllowCredentials` 自动开启。设置为 `*` 时关闭。
:::

## Gateway（网关执行器）

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `OWLAPI_SERVER_URL` | Control Plane gRPC 地址 | `dns:///localhost:9090` |
| `OWLAPI_GATEWAY_ID` | 节点 ID（在控制台创建后获取） | **必填** |
| `OWLAPI_GATEWAY_TOKEN` | 节点鉴权令牌（在控制台创建后获取） | **必填** |
| `OWLAPI_TENANT_ID` | 归属租户 ID | `1` |
| `OWLAPI_QUERY_TIMEOUT_SECONDS` | SQL 查询执行超时（秒） | `30` |
| `OWLAPI_JS_TIMEOUT_SECONDS` | JS 脚本（前置/后置）执行超时（秒） | `5` |
| `OWLAPI_LOG_LEVEL` | 日志级别 | `info` |

## Docker Compose 开发环境

开发环境 (`docker-compose.dev.yml`) 中的默认端口：

| 服务 | 端口 | 说明 |
| :--- | :--- | :--- |
| `backend` | 3000, 9090 | HTTP API + gRPC |
| `admin` | 8001 | Next.js 管理控制台 |
| `docs` | 8003 | VitePress 文档站点 |
| `website` | 8002 | Next.js 官方网站 |
| `postgres` | 5433 → 5432 | 映射 5433 避免与本地 PostgreSQL 冲突 |

数据库默认凭据：`postgres:postgres`，数据库名：`owlapi`
