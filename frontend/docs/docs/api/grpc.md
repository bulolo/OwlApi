# gRPC 协议

Control Plane 与 Gateway 之间通过 gRPC 双向流通信，定义在 `backend/proto/gateway.proto`。

## 服务定义

```protobuf
service GatewayService {
  // Gateway 连接并保持双向流（反向隧道）
  rpc Connect(stream GatewayMessage) returns (stream ServerMessage);
}
```

## Gateway → Server 消息

### RegisterRequest (注册)

Gateway 启动后首先发送注册请求。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| gateway_id | string | 节点唯一标识 |
| gateway_token | string | 节点鉴权令牌 |
| version | string | 节点版本号 |
| tenant_id | string | 归属租户 ID |
| metadata | map\<string, string\> | 扩展元数据 |

### HeartbeatRequest (心跳)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| timestamp | int64 | 时间戳 |
| stats.cpu_percent | double | CPU 使用率 |
| stats.memory_percent | double | 内存使用率 |
| stats.active_connections | int32 | 活跃连接数 |

### QueryResult (查询结果)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| request_id | string | 请求 ID（与 ExecuteQueryRequest 对应） |
| success | bool | 是否成功 |
| error | string | 错误信息 |
| data | bytes | JSON 格式的查询结果 |
| rows_affected | int64 | 影响行数 |
| execution_time_ms | int64 | 执行耗时 (ms) |

## Server → Gateway 消息

### RegisterResponse (注册响应)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| success | bool | 是否成功 |
| error | string | 错误信息 |
| session_id | string | 会话 ID |

### HeartbeatResponse (心跳响应)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| server_time | int64 | 服务端时间戳 |

### ExecuteQueryRequest (执行查询)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| request_id | string | 请求 ID |
| datasource_id | string | 数据源 ID |
| sql | string | SQL 语句 |
| params | map\<string, string\> | 查询参数 |
| timeout_seconds | int32 | 超时时间 (秒) |

## 通信流程

```
Gateway                         Control Plane
  │                                   │
  │── RegisterRequest ──────────────►│
  │◄── RegisterResponse ────────────│
  │                                   │
  │── HeartbeatRequest ─────────────►│  (定期)
  │◄── HeartbeatResponse ───────────│
  │                                   │
  │◄── ExecuteQueryRequest ─────────│  (有查询时)
  │── QueryResult ──────────────────►│
```
