# 接口协议

## gRPC 协议 (Control Plane ↔ Gateway Runner)

控制面与网关执行节点通过双向 gRPC 流进行通信。

### 服务定义

```protobuf
service GatewayService {
  // Gateway Runner 连接并保持双向流
  rpc Connect(stream RunnerMessage) returns (stream ServerMessage);
}
```

### 注册流程

网关节点启动后必须首先发送 `RegisterRequest`：

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `tenant_id` | `string` | **[Required]** 归属租户 ID |
| `node_id` | `string` | 节点唯一标识 |
| `node_token` | `string` | 节点鉴权令牌 |
| `version` | `string` | 节点版本号 |

## HTTP REST API (面向应用开发者)

### 执行查询

**Endpoint**: `GET/POST /api/v1/query/*path`

#### 请求头

| Header | 必填 | 说明 |
| :--- | :--- | :--- |
| `X-Tenant-ID` | 是 | 当前请求所属的租户 ID |
| `X-Runner-ID` | 是 | 指定执行查询的 Gateway Runner ID |

#### 响应格式

```json
[
  { "id": 1, "name": "example", "status": "active" },
  { "id": 2, "name": "test", "status": "pending" }
]
```

#### 示例

```bash
curl -X GET \
  -H "X-Tenant-ID: org_123" \
  -H "X-Runner-ID: node_A" \
  "http://api.owlapi.com/api/v1/query/user_list?status=active"
```
