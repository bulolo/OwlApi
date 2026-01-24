# OwlApi Backend (Go)

欢迎来到 OwlApi 后端项目。本项目是基于 Golang 构建的高性能、分布式数据网关系统。

## 1. 技术栈 (Tech Stack)

- **核心语言**: Go 1.22+
- **通信引擎**: gRPC (Protobuf v3) + HTTP (Gin Framework)
- **存储方案**: PostgreSQL (用于 Control Plane 状态管理)
- **核心组件**: Cloud Control Plane + Edge Gateway Runner 架构

## 2. 核心架构 (Architecture Overview)

本项目包含两个主要二进制单体，通过 **反向隧道 (Reverse Tunneling)** 实现跨内公网的安全通信。

- **Control Plane (Server)**: 负责 API 配置映射、多租户管理及 Runner 调度。
- **Gateway Runner**: 部署在业务内网，主动建立上行连接，负责真正的 SQL 或 AI 逻辑执行。

> [!TIP]
> 详细架构设计请参阅 [docs/backend/architecture.md](../docs/backend/architecture.md)。

## 3. 项目结构 (Structure)

```text
backend/
├── cmd/
│   ├── server/          # 控制面入口
│   └── runner/          # 执行节点入口
├── internal/
│   ├── app/             # 应用层封装 (Runner Logic)
│   ├── domain/          # 核心实体 (Runner, DataSource, APIEndpoint)
│   ├── service/         # 业务逻辑服务 (QueryService, RunnerService)
│   ├── repo/            # 持久化层 (repo/postgres)
│   ├── transport/       # 传输协议实现 (gRPC Handler, HTTP Handler)
│   └── pb/              # 生成的二进制协议代码
└── proto/               # Protobuf 接口定义文件
```

## 4. 快速启动 (Quick Start)

推荐使用 Docker 全栈热更新环境进行开发。

```bash
make dev-up
```

若需生产环境部署，请使用：
```bash
make prod-up
```

## 5. 开发者规范 (Guidelines)

- **多租户隔离**: 所有 API 调用必须包含 `X-Tenant-ID` 请求头。
- **协议首选**: 内部组件通信必须使用 gRPC，对外接口采用 RESTful。
- **持续集成**: 修改 `proto/` 后请运行 `make gen-proto`。

---

## 6. 文档索引

- 📘 [API 接口协议](../docs/backend/api.md)
- 🏗 [系统架构设计](../docs/backend/architecture.md)
- 📝 [多租户实现细节](../docs/backend/architecture.md#3-多租户设计-multi-tenancy)
