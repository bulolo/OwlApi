# 简介

OwlApi 是一个企业级 **SQL to API** 智能网关平台，帮助开发者和企业快速构建及管理数据接口。

## 核心能力

- **极速发布** — 编写 SQL 查询，一键发布为标准 RESTful API 接口
- **多源连接** — 支持 MySQL、PostgreSQL、Oracle 等主流关系型数据库
- **混合云网关** — Gateway Runner 可部署在 IDC、云服务器或边缘设备（如树莓派），通过反向隧道自动建立加密连接
- **多租户隔离** — 原生多租户架构，数据层、连接层、路由层全方位隔离

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| Backend | Go 1.23+, Gin, pgx (PostgreSQL driver) |
| Frontend | Next.js, React, TailwindCSS |
| 通信协议 | gRPC (Protobuf v3), HTTP REST |
| Database | PostgreSQL |
| Infra | Docker, Docker Compose |

## 项目结构

```
owlapi/
├── backend/                    # Go 后端
│   ├── cmd/
│   │   ├── server/             # Control Plane 入口
│   │   └── init/               # 数据库初始化 & Seed
│   ├── internal/
│   │   ├── config/             # 环境变量配置
│   │   ├── domain/             # 核心实体与仓库接口
│   │   ├── service/            # 业务逻辑 (Auth, Tenant, TenantUser)
│   │   ├── repo/postgres/      # PostgreSQL 持久层
│   │   ├── transport/http/     # HTTP Handler, 中间件, Swagger
│   │   └── pkg/                # 通用工具 (JWT, Logger, Errors)
│   └── proto/                  # Protobuf 定义
├── frontend/
│   ├── admin/                  # Next.js 控制台前端
│   ├── website/                # Next.js 官方介绍网站
│   └── docs/                   # VitePress 文档站点
├── deploy/
│   ├── cluster/                # 生产集群部署
│   └── runner/                 # 独立 Gateway Runner 部署
└── docker-compose.dev.yml      # 开发环境
```
