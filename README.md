# OwlApi 云平台

[![Go Report Card](https://goreportcard.com/badge/github.com/bulolo/owlapi)](https://goreportcard.com/report/github.com/bulolo/owlapi)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

> **企业级 SQL to API 智能网关平台**
> 旨在帮助开发者和企业快速构建及管理数据接口与 AI 服务。

OwlApi 是一个强大的 **SQL to API** 平台。它允许您通过编写简单的 SQL 查询，即可一键生成标准的 RESTful API。同时，通过集成的混合云网关与 AI 模型网关，打破网络边界，实现全域数据与算力的统一管理。

---

## 核心特性 (Key Features)

### 🚀 SQL to API 引擎
*只需编写 SQL，API 即刻生成。*
- **极速发布**：编写 SQL 查询，一键发布为标准 RESTful API 接口。
- **多源连接**：无缝连接 MySQL, PostgreSQL, Oracle 等各类主流数据库。
- **项目隔离**：支持多租户/多项目隔离管理，保障数据安全。

### 🌐 混合云网关 (Hybrid Gateway)
*打破内网边界，连接任意设施。*
- **任意部署**：Agent 可运行在本地 IDC、云服务器或边缘设备（树莓派等）。
- **内网穿透**：自动建立加密隧道，无需公网 IP 即可安全访问内网数据库与服务。
- **服务发布**：将内网微服务安全暴露给公网或第三方调用。

### 🤖 AI 模型网关 (AI Model Gateway)
*释放内网算力，统一模型接口。*
- **私有模型代理**：将内网部署的 DeepSeek, Llama, ChatGLM 等大模型安全代理至公网。
- **统一接口管控**：提供兼容 OpenAI 协议的统一 API，内置鉴权、计费与流控功能。

---

## 🛠️ 技术栈 (Tech Stack)

- **Backend**: Go 1.22, gRPC, Gin, GORM
- **Frontend**: Next.js 14, React, TailwindCSS, Framer Motion
- **Database**: PostgreSQL (TimescaleDB optional), Redis
- **Infra**: Docker, Docker Compose
- **AI Integration**: OpenAI Compatible SDK

---

## 🏗️ 系统架构 (Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OwlApi Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │   Frontend      │    │  Control Plane  │    │   Database     │  │
│  │   (Next.js)     │◄──►│   (Go + gRPC)   │◄──►│  (PostgreSQL)  │  │
│  │   :3000         │    │  HTTP :8080     │    │   :5432        │  │
│  └─────────────────┘    │  gRPC :9090     │    └────────────────┘  │
│                         └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │ gRPC 双向流 (HTTP/2)
                                   │ Agent 主动连接
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Gateway Agent   │      │ Gateway Agent   │      │ Gateway Agent   │
│   (公司 IDC)    │      │  (阿里云 ECS)   │      │   (树莓派)      │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ ┌─────────────┐ │      │ ┌─────────────┐ │      │ ┌─────────────┐ │
│ │ MySQL       │ │      │ │ PostgreSQL  │ │      │ │ DeepSeek    │ │
│ │ Oracle      │ │      │ │ MongoDB     │ │      │ │ (本地LLM)   │ │
│ └─────────────┘ │      │ └─────────────┘ │      │ └─────────────┘ │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 🖥️ Control Plane (控制面)
部署在云端的核心服务，负责：
- **用户管理**：多租户、项目隔离、权限控制
- **API 定义**：SQL 查询管理、参数映射、版本控制
- **Agent 管理**：注册、心跳监控、状态同步
- **流量路由**：将 API 请求路由到正确的 Agent

### 🔌 Gateway Agent (网关代理)
部署在用户内网的轻量级代理，负责：
- **反向隧道**：主动连接 Control Plane，无需公网 IP
- **数据库执行**：接收 SQL 指令，执行查询，返回结果
- **AI 代理**：转发 LLM 请求到内网模型服务
- **安全隔离**：敏感数据不出内网，仅传输查询结果

### 🔄 数据流示例
```
用户请求 → Control Plane → gRPC Stream → Gateway Agent → 内网数据库
                ↑                              │
                └──────── 查询结果 ◄───────────┘
```

---

## 🚀 快速开始 (Quick Start)

### 使用 Docker Compose（推荐）
```bash
# 克隆项目
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 启动所有服务
make docker-up

# 访问
# - 前端: http://localhost:3000
# - API: http://localhost:8080
```

### 部署 Gateway Agent

详细部署指南请参考 [`deploy/agent/README.md`](deploy/agent/README.md)

```bash
# 下载配置
curl -O https://raw.githubusercontent.com/bulolo/owlapi/main/deploy/agent/docker-compose.yml

# 编辑配置（填入您的 AGENT_ID 和 AGENT_TOKEN）
vim docker-compose.yml

# 启动 Agent
docker compose up -d
```

---

## 🛠️ 开发指南 (Development)

### 环境要求
- Go 1.22+
- Node.js 18+
- Docker & Docker Compose

### 常用命令
```bash
make help          # 查看所有可用命令
make dev           # 启动开发环境（数据库）
make build         # 构建所有二进制文件
make docker-build  # 构建 Docker 镜像
```

### 本地开发
```bash
# 启动数据库
make dev

# 启动后端（另一个终端）
cd backend && go run ./cmd/server

# 启动前端（另一个终端）
cd frontend && pnpm dev
```

---

## 📁 项目结构

```
owlapi/
├── backend/                    # Go 后端
│   ├── cmd/                    # 入口文件
│   │   ├── server/             # Control Plane 入口
│   │   └── agent/              # Gateway Agent 入口
│   ├── internal/               # 内部模块
│   │   ├── domain/             # (NEW) 核心领域层 (Entities/Repo Interfaces)
│   │   ├── service/            # (NEW) 业务逻辑层 (Use Cases)
│   │   ├── repo/               # (NEW) 数据持久层 (DB/Redis)
│   │   ├── transport/          # (NEW) 传输层
│   │   │   ├── http/           # HTTP Handlers
│   │   │   └── grpc/           # gRPC Handlers
│   │   ├── app/                # 应用组装 (Wiring)
│   │   ├── config/             # 配置管理
│   │   └── pkg/                # 内部通用包 (Logger, Core)
│   ├── proto/                  # gRPC Proto 定义
│   ├── Dockerfile.server
│   ├── Dockerfile.agent
│   └── go.mod
├── docs/                       # (NEW) 项目文档
│   ├── architecture/           # 架构设计
│   └── api/                    # API 定义
├── scripts/                    # (NEW) 工程化脚本
│   ├── db/                     # DB 迁移
│   └── dev/                    # 开发辅助
├── frontend/                   # Next.js 前端
│   ├── src/
│   └── package.json
├── deploy/                     # 生产部署配置
│   ├── server/                 # 服务端部署
│   │   ├── docker-compose.yml
│   │   └── README.md
│   └── agent/                  # Agent 部署
│       ├── docker-compose.yml
│       └── README.md
├── docker-compose.dev.yml      # 本地开发编排
├── Makefile                    # 构建脚本
└── README.md
```

---

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源授权。