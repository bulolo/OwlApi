# OwlApi 云平台

[![Go Report Card](https://goreportcard.com/badge/github.com/bulolo/owlapi)](https://goreportcard.com/report/github.com/bulolo/owlapi)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

> **企业级 SQL to API 智能网关平台**
> 旨在帮助开发者和企业快速构建及管理数据接口。

OwlApi 是一个强大的 **SQL to API** 平台。它允许您通过编写简单的 SQL 查询，即可一键生成标准的 RESTful API。同时，通过集成的混合云网关，打破网络边界，实现全域数据的统一管理。

---

## 核心特性 (Key Features)

### 🚀 SQL to API 引擎
*只需编写 SQL，API 即刻生成。*
- **极速发布**：编写 SQL 查询，一键发布为标准 RESTful API 接口。
- **多源连接**：无缝连接 MySQL, PostgreSQL, Oracle 等各类主流数据库。
- **项目隔离**：支持多租户/多项目隔离管理，保障数据安全。

### 🌐 混合云网关 (Hybrid Gateway)
*打破内网边界，连接任意设施。*
- **任意部署**：Runner 可运行在本地 IDC、云服务器或边缘设备（树莓派等）。
- **内网穿透**：自动建立加密隧道，无需公网 IP 即可安全访问内网数据库与服务。
- **服务发布**：将内网微服务安全暴露给公网或第三方调用。

---

## 🛠️ 技术栈 (Tech Stack)

- **Backend**: Go 1.22, gRPC, Gin, GORM
- **Frontend**: Next.js 14, React, TailwindCSS, Framer Motion
- **Database**: PostgreSQL (TimescaleDB optional), Redis
- **Infra**: Docker, Docker Compose

---

## 🏗️ 系统架构 (Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OwlApi Cloud                                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │   Frontend      │    │  Control Plane  │    │   Database     │  │
│  │   (Next.js)     │◄──►│   (Go + gRPC)   │◄──►│  (PostgreSQL)  │  │
│  │   :8000         │    │  HTTP :3000     │    │   :5432        │  │
│  └─────────────────┘    │  gRPC :9090     │    └────────────────┘  │
│                         └────────┬────────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                    │ gRPC 双向流 (HTTP/2)
                                    │ Gateway Runner 主动连接
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Gateway Runner  │      │ Gateway Runner  │      │ Gateway Runner  │
│   (公司 IDC)    │      │  (阿里云 ECS)   │      │   (树莓派)      │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ ┌─────────────┐ │      │ ┌─────────────┐ │      │ ┌─────────────┐ │
│ │ MySQL       │ │      │ │ PostgreSQL  │ │      │ │ SQLite      │ │
│ │ Oracle      │ │      │ │ MongoDB     │ │      │ │ MariaDB     │ │
│ └─────────────┘ │      │ └─────────────┘ │      │ └─────────────┘ │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 🖥️ Control Plane (控制面)
部署在云端的核心服务，负责：
- **用户管理**：多租户、项目隔离、权限控制
- **API 定义**：SQL 查询管理、参数映射、版本控制
- **Gateway Runner 管理**：注册、心跳监控、状态同步
- **流量路由**：将 API 请求路由到正确的 Gateway Runner

### 🔌 Gateway Runner (网关执行节点)
部署在用户内网的轻量级代理，负责：  
- **反向隧道**：主动连接 Control Plane，无需公网 IP
- **数据库执行**：接收 SQL 指令，执行查询，返回结果
- **安全隔离**：敏感数据不出内网，仅传输查询结果

### 🔄 数据流示例
```
用户请求 → Control Plane → gRPC Stream → Gateway Runner → 内网数据库
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
# - 前端: http://localhost:8000
# - API: http://localhost:3000
```

### 部署分发版

详细部署指南请参考 [`deploy/cluster/README.md`](deploy/cluster/README.md) 或 [`deploy/runner/README.md`](deploy/runner/README.md)

```bash
# 下载执行节点配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/runner/docker-compose.yml

# 编辑配置（填入您的 RUNNER_ID 和 RUNNER_TOKEN）
vim docker-compose.yml

# 启动 Runner
docker compose up -d
```

---

## 🛠️ 开发指南 (Development)

### 核心文档索引
- 🏗 [系统架构设计 (含多租户原理)](docs/backend/architecture.md)
- 📗 [后端开发 README (快速 setup)](backend/README.md)
- 📘 [API 协议定义 (gRPC & REST)](docs/backend/api.md)

### 常用命令
### 常用命令
```bash
make gen-proto         # 生成 gRPC 代码 (辅助)
make dev-up            # 启动开发环境 (Hot-Reload)
make prod-up           # 启动生产环境 (Stable)
```

### 部署与运维
```bash
# 生产环境部署
make prod-up

# 查看生产日志
make prod-logs
```

---

## 📁 项目结构

```
owlapi/
├── backend/                    # Go 后端核心 (All-Go 架构)
│   ├── cmd/                    # 程序入口 (Server & Runner)
│   ├── internal/               # 内部核心模块
│   │   ├── domain/             # 核心实体与仓库接口定义
│   │   ├── service/            # 业务逻辑服务 (Query, Runner)
│   │   ├── repo/               # 数据隔离持久层 (PostgreSQL)
│   │   └── transport/          # 传输协议层 (gRPC & HTTP)
│   ├── proto/                  # 协议定义
│   └── README.md               # 后端详细指南
├── docs/                       # 系统全局文档
│   ├── architecture/           # 架构图示
│   └── backend/                # 后端详细设计与 API 规范
├── frontend/                   # Next.js 控制台前端
├── deploy/                     # 生产环境部署资源
└── Makefile                    # 合一化构建脚本
```

---

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源授权。