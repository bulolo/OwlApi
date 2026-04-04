# 快速开始

## 使用 Docker Compose 启动开发环境

```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 启动全栈热更新环境 (前台运行, 查看日志)
make dev-up
```

启动后可访问：
- Admin 控制台: http://localhost:8000
- API 服务: http://localhost:3000
- 文档站点: http://localhost:8001
- PostgreSQL: localhost:5433

## 开发环境命令

| 命令 | 说明 |
| :--- | :--- |
| `make dev-up` | 启动全栈热更新环境 (前台运行, 查看日志) |
| `make dev-down` | 停止开发容器 |
| `make dev-build` | 构建开发镜像 |
| `make dev-rebuild` | 重建并启动开发环境 (后台运行) |
| `make dev-restart` | 重启开发环境所有服务 |
| `make dev-restart-backend` | 仅重启后端服务 |
| `make dev-logs` | 查看所有服务日志 |
| `make dev-logs-backend` | 查看后端日志 |
| `make dev-clean` | 停止容器并删除数据卷 (重置数据库) |
| `make dev-db-psql` | 进入开发环境数据库终端 |

## 生产环境命令

| 命令 | 说明 |
| :--- | :--- |
| `make prod-up` | 启动生产集群 (后台运行, 拉取远端镜像) |
| `make prod-up-build` | 启动生产集群并在本地构建 |
| `make prod-rebuild` | 无缓存重新构建并启动生产环境 |
| `make prod-down` | 停止生产集群 |
| `make prod-restart` | 重启生产环境所有服务 |
| `make prod-logs` | 查看生产环境日志 |
| `make prod-clean` | 停止容器并删除数据卷 (⚠️ 清空生产数据) |

## 通用工具命令

| 命令 | 说明 |
| :--- | :--- |
| `make gen-proto` | 生成 gRPC 代码 (buf generate) |
| `make gen-sdk` | 从 OpenAPI spec 生成前端 TypeScript SDK |
| `make clean` | 清理所有环境与缓存 |

## 部署独立 Gateway Runner

将 Gateway Runner 部署到内网环境，即可安全访问内网数据库：

```bash
# 下载 Gateway Runner 配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/runner/docker-compose.yml

# 编辑配置（填入 RUNNER_ID 和 RUNNER_TOKEN）
vim docker-compose.yml

# 启动
docker compose up -d
```
