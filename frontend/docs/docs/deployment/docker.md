# Docker 生产部署

本文介绍如何使用 Docker Compose 将 OwlApi 部署到生产服务器。

## 前置要求

- **服务器**：Linux（推荐 Ubuntu 22.04+）
- **Docker** >= 20.10 & **Docker Compose** V2
- **Make** 工具（可选，用于 Makefile 命令）
- 域名与 SSL 证书（用于 HTTPS 配置）

---

## 一键部署流程

### 第一步：克隆项目

```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 第二步：初始化生产配置

```bash
make prod-init
```

该命令会将 `backend/.env.example` 复制为 `deploy/.env`，并提示需要修改的敏感配置项。

### 第三步：修改关键配置

```bash
vim deploy/.env
```

必须修改以下三项：

| 变量 | 说明 | 生成方式 |
| :--- | :--- | :--- |
| `OWLAPI_JWT_SECRET` | JWT 签名密钥 | `openssl rand -hex 32` |
| `OWLAPI_GATEWAY_TOKEN` | 网关鉴权令牌 | `openssl rand -hex 16` |
| `POSTGRES_PASSWORD` | 数据库密码 | 自定义强密码 |
| `PUBLIC_API_URL` | 后端 API 公网地址 | 如 `https://api.yourdomain.com` |
| `OWLAPI_CORS_ORIGIN` | Admin 前端域名 | 如 `https://admin.yourdomain.com` |

::: warning
`OWLAPI_JWT_SECRET` 未设置或使用默认值时，服务会打印警告日志。生产环境务必修改为随机强密钥。
:::

### 第四步：启动服务

**拉取远端镜像启动（推荐）：**

```bash
make prod-up
```

**本地构建并启动：**

```bash
make prod-up-build
```

---

## 部署架构

生产环境默认启动以下服务：

| 容器 | 说明 | 端口 |
| :--- | :--- | :--- |
| `owlapi_backend` | Control Plane（HTTP + gRPC） | `127.0.0.1:3000` |
| `owlapi_admin` | Admin 管理控制台 | `127.0.0.1:8001` |
| `owlapi_postgres` | PostgreSQL 数据库 | 仅内部访问 |
| `owlapi_gateway` | 内置 Gateway 节点 | 仅内部访问 |
| `owlapi_init` | 初始化容器（自动退出） | — |

::: tip
gRPC 端口（9090）仅供 Gateway 容器内部使用，不对外暴露，无需防火墙放行。
:::

---

## 常用运维命令

| 命令 | 说明 |
| :--- | :--- |
| `make prod-up` | 启动生产集群（拉取远端镜像） |
| `make prod-up-build` | 本地构建并启动 |
| `make prod-down` | 停止所有容器，保留数据卷 |
| `make prod-restart` | 重启所有服务 |
| `make prod-logs` | 查看所有服务日志 |
| `make prod-clean` | 停止并删除所有数据卷（⚠️ 数据将清空） |

---

## 数据持久化

生产环境使用 Docker named volumes 持久化数据：

| Volume | 说明 |
| :--- | :--- |
| `postgres_data` | PostgreSQL 数据库文件 |
| `gateway_data` | Gateway SQLite 缓存文件 |

::: warning
`make prod-clean` 会删除上述数据卷，执行前请确认已做好数据备份。
:::

---

## 静态站点单独部署

文档站和官网可独立部署，不依赖后端服务：

```bash
# 拉取镜像启动
make prod-static-up

# 本地构建启动
make prod-static-up-build
```

启动后：
- 文档中心：`http://127.0.0.1:8003`
- 官方网站：`http://127.0.0.1:8004`

---

## 升级版本

```bash
# 拉取最新代码
git pull

# 重启服务（自动拉取新镜像）
make prod-restart

# 或强制重建（无缓存）
make prod-rebuild
```
