# gRPC 协议

Control Plane 与 Gateway 之间通过 gRPC 双向流通信，定义在 `backend/proto/gateway.proto`。

## 服务定义

```protobuf
service GatewayService {
  // Gateway 主动连接，建立反向隧道双向流
  rpc Connect(stream GatewayMessage) returns (stream ServerMessage);
}
```

## Gateway → Server 消息（GatewayMessage）

`GatewayMessage` 是一个 `oneof` 结构，每条消息是以下三种之一：

### RegisterRequest（注册）

Gateway 启动后发送的第一条消息。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| gateway_id | string | 节点唯一标识（数字 ID） |
| gateway_token | string | 节点鉴权令牌 |
| version | string | 节点版本号 |
| tenant_id | string | 归属租户 ID |
| metadata | map\<string, string\> | 扩展元数据 |

### HeartbeatRequest（心跳）

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| timestamp | int64 | Unix 时间戳（秒） |
| stats.cpu_percent | double | CPU 使用率 |
| stats.memory_percent | double | 内存使用率 |
| stats.active_connections | int32 | 活跃连接数 |

### QueryResult（查询结果）

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| request_id | string | 请求 ID（与 ExecuteQueryRequest 对应） |
| success | bool | 是否成功 |
| error | string | 错误信息 |
| data | bytes | JSON 格式的查询结果 |
| rows_affected | int64 | 影响行数 |
| execution_time_ms | int64 | 执行耗时（ms） |

## Server → Gateway 消息（ServerMessage）

`ServerMessage` 是一个 `oneof` 结构：

### RegisterResponse（注册响应）

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| success | bool | 是否注册成功 |
| error | string | 错误信息 |
| session_id | string | 会话 ID |

### HeartbeatResponse（心跳响应）

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| server_time | int64 | 服务端 Unix 时间戳 |

### ExecuteQueryRequest（执行查询）

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| request_id | string | 请求 ID（用于匹配 QueryResult） |
| dsn | string | 数据库连接串（Gateway 侧解析，不在 Control Plane 存储） |
| db_type | string | 数据库类型（`mysql` / `postgres` / `sqlserver` / `sqlite` / `starrocks` / `doris`），优先于 DSN 前缀推断 |
| sql | string | 待执行的 SQL 语句 |
| params | map\<string, string\> | 查询参数（替换 SQL 中的占位符） |
| timeout_seconds | int32 | SQL 执行超时（秒） |
| pre_script | string | 前置 JS 脚本（在执行 SQL 前修改 params） |
| post_script | string | 后置 JS 脚本（在返回结果前转换 data） |

## 通信流程

```
Gateway                              Control Plane
  │                                        │
  │── RegisterRequest ─────────────────►  │  验证 gateway_token
  │◄── RegisterResponse ───────────────   │  返回 session_id
  │                                        │
  │── HeartbeatRequest ────────────────►  │  (每 20s)
  │◄── HeartbeatResponse ──────────────   │  更新 last_seen、stats
  │                                        │
  │                              外部 HTTP 请求到达
  │                                        │  匹配已发布接口
  │◄── ExecuteQueryRequest ────────────   │  填充 dsn, db_type, sql, params, scripts
  │   执行前置脚本 → SQL → 后置脚本       │
  │── QueryResult ─────────────────────►  │  透传 JSON 响应给调用方
```

## 安全说明

- Gateway Token 在注册时由 Control Plane 验证，验证失败时流会被服务端关闭
- DSN 连接串仅从 Control Plane 下发到 Gateway，不持久化在 Control Plane 数据库中（数据源环境配置中存储加密 DSN，查询时按需取出）
- 所有数据不经过 Control Plane 中转落盘，仅透传查询结果字节流
