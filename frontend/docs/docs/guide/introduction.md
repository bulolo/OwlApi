# 简介

OwlApi 是一个企业级 **SQL to API** 智能网关平台，帮助开发者和企业快速构建及管理数据接口。

## 核心能力

- **极速发布** — 编写 SQL 查询，一键发布为标准 RESTful API 接口，支持版本管理与灰度回滚
- **多源连接** — 支持 MySQL、PostgreSQL、SQL Server、StarRocks、Doris、SQLite
- **混合云网关** — Gateway 可部署在 IDC、云服务器或边缘设备，通过 gRPC 反向隧道自动建立加密连接，无需公网 IP
- **多租户隔离** — 原生多租户架构，数据层、连接层、路由层全方位隔离
- **脚本扩展** — 支持 JavaScript 前置/后置脚本对请求和响应进行自定义处理
- **API 分组** — 支持将接口按业务分组管理，自动导出 OpenAPI/Swagger 规范

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| Backend | Go 1.23+, Gin, pgx (PostgreSQL driver), goose (migrations) |
| Frontend | Next.js 15, React, TailwindCSS, Zustand |
| 通信协议 | gRPC (Protobuf v3), HTTP REST |
| Database | PostgreSQL |
| Infra | Docker, Docker Compose |

## 项目结构

```
owlapi/
├── backend/                       # Go 后端
│   ├── cmd/
│   │   ├── server/                # Control Plane 服务入口
│   │   ├── gateway/               # Gateway 代理入口
│   │   └── init/                  # 数据库初始化 & 迁移
│   ├── internal/
│   │   ├── config/                # 环境变量配置（ServerConfig / GatewayConfig）
│   │   ├── domain/                # 核心实体与 Repository 接口
│   │   ├── service/               # 业务逻辑（14 个 Service 接口）
│   │   ├── repo/postgres/         # PostgreSQL 持久层（pgx + goose 迁移）
│   │   ├── transport/
│   │   │   ├── http/              # Gin Handler、中间件、Swagger、DTO
│   │   │   └── grpc/              # gRPC Handler（双向流）
│   │   ├── gateway/               # Gateway 执行器（SQL 查询、JS 脚本）
│   │   ├── pb/                    # Protobuf 生成代码
│   │   └── pkg/                   # 通用工具（JWT、Logger、PathUtil）
│   └── proto/                     # Protobuf 定义 (gateway.proto)
├── frontend/
│   ├── admin/                     # Next.js 管理控制台
│   ├── website/                   # Next.js 官方介绍网站
│   └── docs/                      # VitePress 文档站点（本站）
├── deploy/
│   ├── docker-compose.yml         # 生产集群部署
│   ├── docker-compose.gateway.yml # 独立 Gateway 部署
│   ├── docker-compose.static.yml  # 文档站 + 官网静态部署
│   └── nginx/                     # Nginx 反向代理配置
├── docker-compose.dev.yml         # 开发环境（热更新）
└── Makefile                       # 常用命令入口
```
