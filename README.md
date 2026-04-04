# OwlApi 云平台

[![Go Report Card](https://goreportcard.com/badge/github.com/bulolo/owlapi)](https://goreportcard.com/report/github.com/bulolo/owlapi)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.dev.yml)

> **企业级 SQL to API 智能网关平台**
> 编写 SQL，一键生成 RESTful API。混合云网关，打破内网边界。

---

## 核心特性

- 🚀 **SQL to API** — 编写 SQL 查询，一键发布为标准 RESTful API，支持 MySQL、PostgreSQL、Oracle 等
- 🌐 **混合云网关** — Gateway Runner 部署在任意内网环境，通过 gRPC 反向隧道自动建立加密连接
- 🔒 **多租户隔离** — 原生多租户架构，SuperAdmin / Admin / Viewer 三级角色，数据层全方位隔离

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| Backend | Go 1.23+, Gin, pgx, gRPC |
| Frontend | Next.js, React, TailwindCSS |
| Database | PostgreSQL |
| Infra | Docker, Docker Compose |

## 快速开始

```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
make dev-up
```

| 服务 | 地址 |
| :--- | :--- |
| Admin 控制台 | http://localhost:8000 |
| API 服务 | http://localhost:3000 |
| 文档站点 | http://localhost:8001 |
| PostgreSQL | localhost:5433 |

更多命令请运行 `make help`。

## 项目结构

```
owlapi/
├── backend/                        # Go 后端
│   ├── cmd/
│   │   ├── server/                 # Control Plane 入口
│   │   ├── runner/                 # Gateway Runner 入口
│   │   └── init/                   # 数据库初始化 & Seed
│   ├── internal/
│   │   ├── config/                 # 环境变量配置
│   │   ├── domain/                 # 核心实体 & Repository 接口
│   │   ├── service/                # 业务逻辑
│   │   │   ├── auth.go             # 认证、租户、用户管理
│   │   │   ├── query.go            # SQL to API 查询分发
│   │   │   └── runner.go           # Gateway Runner 管理
│   │   ├── repo/postgres/          # PostgreSQL 持久层 (pgx)
│   │   ├── transport/
│   │   │   ├── http/               # REST API (Gin)
│   │   │   └── grpc/               # gRPC Server (Runner 连接)
│   │   ├── gateway/                # Runner 端: 连接管理、SQL 执行、心跳
│   │   ├── pb/                     # Protobuf 生成代码
│   │   └── pkg/
│   │       ├── auth/               # JWT
│   │       ├── core/               # 错误定义、Context Key
│   │       ├── logger/             # 日志
│   │       └── dbdriver/           # 多数据库驱动抽象
│   └── proto/                      # Protobuf 定义源文件
├── frontend/
│   ├── admin/                      # Next.js 控制台前端
│   └── docs/                       # VitePress 文档站点
├── deploy/
│   ├── cluster/                    # 生产集群部署
│   └── runner/                     # 独立 Gateway Runner 部署
├── docker-compose.dev.yml          # 开发环境
└── Makefile                        # 项目管理脚本
```

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OwlApi Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │   Admin         │    │  Control Plane  │    │   Database     │  │
│  │   (Next.js)     │◄──►│   (Go + Gin)    │◄──►│  (PostgreSQL)  │  │
│  │   :8000         │    │  HTTP :3000     │    │   :5432        │  │
│  └─────────────────┘    │  gRPC :9090     │    └────────────────┘  │
│                         └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                    │ gRPC 双向流 (HTTP/2)
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Gateway Runner  │      │ Gateway Runner  │      │ Gateway Runner  │
│   (公司 IDC)    │      │  (阿里云 ECS)   │      │   (树莓派)      │
│  MySQL / Oracle │      │  PostgreSQL     │      │  SQLite         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

```
用户请求 → Control Plane (HTTP) → gRPC Stream → Gateway Runner → 内网数据库
                ↑                                      │
                └──────────── 查询结果 (JSON) ◄────────┘
```

## 文档

完整文档请访问文档站点：http://localhost:8001（启动 `make dev-up` 后）

- [简介](frontend/docs/docs/guide/introduction.md)
- [系统架构](frontend/docs/docs/guide/architecture.md)
- [多租户与权限](frontend/docs/docs/guide/multi-tenancy.md)
- [REST API](frontend/docs/docs/api/rest.md)
- [gRPC 协议](frontend/docs/docs/api/grpc.md)
- [环境变量](frontend/docs/docs/api/config.md)

## 开源协议

本项目采用 [MIT License](LICENSE) 开源授权。
