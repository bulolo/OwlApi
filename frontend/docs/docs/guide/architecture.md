# 系统架构

OwlApi 采用 **云端控制面 (Control Plane)** + **边缘执行节点 (Gateway Runner)** 的分布式架构。

## 总体架构

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
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Gateway Runner  │      │ Gateway Runner  │      │ Gateway Runner  │
│   (公司 IDC)    │      │  (阿里云 ECS)   │      │   (树莓派)      │
│  MySQL / Oracle │      │  PostgreSQL     │      │  SQLite         │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## 核心组件

### Control Plane (控制面)

部署在云端的核心服务：

- **用户管理** — 多租户、项目隔离、权限控制
- **API 定义** — SQL 查询管理、参数映射、版本控制
- **Runner 管理** — 注册、心跳监控、状态同步
- **流量路由** — 将 API 请求路由到正确的 Gateway Runner

### Gateway Runner (执行节点)

部署在用户内网的轻量级代理：

- **反向隧道** — 主动连接 Control Plane，无需公网 IP
- **数据库执行** — 接收 SQL 指令，执行查询，返回结果
- **安全隔离** — 敏感数据不出内网，仅传输查询结果

## 通信模型

Gateway Runner 启动时通过 gRPC 双向流主动建立到 Control Plane 的连接（反向隧道）。

```
用户请求 → Control Plane → gRPC Stream → Gateway Runner → 内网数据库
                ↑                              │
                └──────── 查询结果 ◄───────────┘
```

### 协议栈

| 层级 | 技术 |
| :--- | :--- |
| Transport | gRPC over HTTP/2 (TLS 1.3) |
| Serialization | Protocol Buffers v3 |
| Data Format | JSON (QueryResult) |

## SQL 执行驱动

Gateway Runner 内部采用插拔式驱动设计：

- **Mock** — 用于全链路联通性测试
- **Generic SQL** — 基于 `database/sql` 支持主流关系型数据库
