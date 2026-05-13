# 快速开始

## 使用 Docker Compose 启动开发环境

```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 第一次启动：先初始化配置文件（生成 backend/.env）
make dev-init

# 启动全栈热更新环境（前台运行，查看日志）
make dev-up
```

::: warning
`make dev-init` 必须在首次启动前执行，否则 `make dev-up` 会因找不到 `backend/.env` 而报错。
:::

启动后可访问：

| 服务 | 地址 | 说明 |
| :--- | :--- | :--- |
| Admin 控制台 | http://localhost:8001 | 管理界面 |
| API 服务 | http://localhost:3000 | Control Plane HTTP |
| gRPC 服务 | localhost:9090 | Gateway 连接端点 |
| Swagger | http://localhost:3000/swagger/index.html | API 在线文档 |
| 文档站点 | http://localhost:8003 | 本站 |
| 官方网站 | http://localhost:8002 | 介绍页 |
| PostgreSQL | localhost:5433 | 使用 5433 避免与本地实例冲突 |

## 开发环境命令

| 命令 | 说明 |
| :--- | :--- |
| `make dev-init` | 初始化开发环境配置（复制 `backend/.env.example` → `backend/.env`） |
| `make dev-up` | 启动全栈热更新环境（前台运行） |
| `make dev-down` | 停止开发容器 |
| `make dev-build` | 构建开发镜像 |
| `make dev-rebuild` | 重建并启动开发环境（后台运行） |
| `make dev-restart` | 重启所有服务 |
| `make dev-restart-backend` | 仅重启后端服务 |
| `make dev-logs` | 查看所有服务日志 |
| `make dev-logs-backend` | 查看后端日志 |
| `make dev-clean` | 停止容器并删除数据卷（重置数据库，有二次确认） |
| `make dev-db-psql` | 进入开发环境数据库终端 |

## 生产环境命令

```bash
# 第一次部署：先初始化生产配置，然后修改敏感信息
make prod-init
vim deploy/.env   # 修改 OWLAPI_JWT_SECRET、POSTGRES_PASSWORD 等

# 启动（拉取远端镜像）
make prod-up
```

| 命令 | 说明 |
| :--- | :--- |
| `make prod-init` | 初始化生产配置（生成 `deploy/.env`） |
| `make prod-up` | 启动生产集群（后台运行，拉取远端镜像） |
| `make prod-up-build` | 启动生产集群并在本地构建 |
| `make prod-rebuild` | 无缓存重新构建并启动 |
| `make prod-down` | 停止生产集群 |
| `make prod-restart` | 重启生产环境所有服务 |
| `make prod-logs` | 查看生产环境日志 |
| `make prod-clean` | 停止容器并删除数据卷（⚠️ 清空生产数据，有二次确认） |

## 静态站点命令

文档站和官网可单独部署，不依赖后端服务：

| 命令 | 说明 |
| :--- | :--- |
| `make prod-static-up` | 启动文档站 + 官网（拉取远端镜像） |
| `make prod-static-up-build` | 本地构建并启动文档站 + 官网 |
| `make prod-static-down` | 停止文档站 + 官网 |
| `make prod-static-logs` | 查看文档站 + 官网日志 |

## 代码质量命令

| 命令 | 说明 |
| :--- | :--- |
| `make format` | 格式化代码（后端 `gofmt` + 前端 `eslint --fix`） |
| `make check-all` | 全量检查（gofmt + go vet + eslint + tsc） |
| `make check-changed` | 增量检查（仅已暂存文件，供 pre-commit 使用） |
| `make setup-hooks` | 配置 Git pre-commit hook |

## 代码生成命令

| 命令 | 说明 |
| :--- | :--- |
| `make gen-swagger` | 生成 Swagger 文档（`backend/docs/swagger.json`） |
| `make gen-proto` | 生成 gRPC 代码（`backend/internal/pb/`） |
| `make gen-sdk` | 从 OpenAPI 生成前端 TypeScript SDK（含 `gen-swagger`） |

## 部署独立 Gateway

将 Gateway 部署到内网环境，即可安全访问内网数据库。

**第一步：** 在 Admin 控制台的「网关管理」中创建 Gateway 节点，获取 `GATEWAY_ID` 和 `GATEWAY_TOKEN`。

**第二步：** 在内网环境下载配置文件并填写参数：

```bash
# 使用官方 Gateway compose 配置
curl -O https://raw.githubusercontent.com/bulolo/owlapi/main/deploy/docker-compose.gateway.yml

# 编辑配置（填入从控制台获取的 ID 和 Token）
vim docker-compose.gateway.yml
```

或直接创建以下内容：

```yaml
services:
  gateway:
    image: bulolo/owlapi-gateway:latest
    restart: unless-stopped
    environment:
      OWLAPI_SERVER_URL: "dns:///your-control-plane-host:9090"
      OWLAPI_GATEWAY_ID: "1"
      OWLAPI_GATEWAY_TOKEN: "your-token"
      OWLAPI_TENANT_ID: "1"
```

**第三步：** 启动：

```bash
docker compose -f docker-compose.gateway.yml up -d
```

Gateway 启动后会自动通过 gRPC 反向隧道连接 Control Plane，并在控制台中显示为在线状态。
