# OwlApi Backend

基于 Go 构建的高性能分布式数据网关系统。

## 技术栈

- Go 1.23+, Gin, pgx (PostgreSQL), gRPC (Protobuf v3)

## 架构

- **Control Plane (Server)** — API 配置映射、多租户管理、Runner 调度
- **Gateway Runner** — 部署在内网，主动建立上行连接，执行 SQL 查询

## 项目结构

```
backend/
├── cmd/
│   ├── server/             # Control Plane 入口
│   ├── runner/             # Gateway Runner 入口
│   └── init/               # 数据库初始化 & Seed
├── internal/
│   ├── config/             # 环境变量配置
│   ├── domain/             # 核心实体 & Repository 接口
│   ├── service/            # 业务逻辑 (Auth, Query, Runner)
│   ├── repo/postgres/      # PostgreSQL 持久层
│   ├── transport/
│   │   ├── http/           # REST API (Gin)
│   │   └── grpc/           # gRPC Server
│   ├── gateway/            # Runner 端逻辑
│   ├── pb/                 # Protobuf 生成代码
│   └── pkg/                # 通用工具 (JWT, Logger, Errors, DBDriver)
└── proto/                  # Protobuf 定义源文件
```

## 快速启动

```bash
make dev-up       # Docker 全栈热更新
make prod-up      # 生产环境部署
make gen-proto    # 生成 gRPC 代码
```

## 开发规范

- 所有 API 调用通过 JWT 鉴权，租户通过 URL `:slug` 参数定位
- 内部组件通信使用 gRPC，对外接口采用 RESTful
- 修改 `proto/` 后运行 `make gen-proto`
