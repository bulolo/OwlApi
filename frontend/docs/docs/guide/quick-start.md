# 快速开始

## 使用 Docker Compose（推荐）

```bash
# 克隆项目
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 启动所有服务
make docker-up

# 访问
# - 前端控制台: http://localhost:8000
# - API 服务: http://localhost:3000
# - 文档站点: http://localhost:8001
```

## 开发环境

```bash
make dev-up       # 启动开发环境 (Hot-Reload)
make prod-up      # 启动生产环境
make gen-proto    # 生成 gRPC 代码
```

## 部署 Gateway Runner

将 Runner 部署到你的内网环境，即可安全访问内网数据库。

```bash
# 下载 Runner 配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/runner/docker-compose.yml

# 编辑配置（填入 RUNNER_ID 和 RUNNER_TOKEN）
vim docker-compose.yml

# 启动
docker compose up -d
```

详细部署指南请参考 [集群部署](https://github.com/bulolo/owlapi/tree/main/deploy/cluster) 或 [Runner 部署](https://github.com/bulolo/owlapi/tree/main/deploy/runner)。
