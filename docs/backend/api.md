# OwlApi 后端接口协议文档

本文档定义了 **Control Plane** 与 **Gateway Runner** 之间，以及控制面对外暴露的系统级与应用级 API 协议。

## 1. gRPC 协议 (Control Plane ↔ Gateway Runner)

控制面与网关执行节点通过双向 gRPC 流进行通信。

### 1.1 服务定义 `GatewayService`

```protobuf
service GatewayService {
  // Gateway Runner 连接并保持双向流
  rpc Connect(stream RunnerMessage) returns (stream ServerMessage);
}
```

### 1.2 注册流程 (Registration)

网关节点启动后必须首先发送 `RegisterRequest`。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `tenant_id` | `string` | **[Required]** 归属租户 ID |
| `node_id` | `string` | 节点唯一标识 |
| `node_token` | `string` | 节点鉴权令牌 |
| `version` | `string` | 节点版本号 |

---

## 2. HTTP REST API (面向应用开发者)

控制面向第三方应用暴露 SQL-to-API 的动态转换接口。

### 2.1 执行查询接口 (Dynamic Query)

**Endpoint**: `GET/POST /api/v1/query/*path`

#### 请求头 (Request Headers)

| Header | 是否必填 | 说明 |
| :--- | :--- | :--- |
| `X-Tenant-ID` | **是** | 当前请求所属的租户 ID |
| `X-Runner-ID` | **是** | 指定负责执行该查询的 Gateway Runner ID |

#### 响应格式

```json
[
  { "id": 1, "name": "example", "status": "active" },
  { "id": 2, "name": "test", "status": "pending" }
]
```

#### Curl 示例

```bash
curl -X GET \
  -H "X-Tenant-ID: org_123" \
  -H "X-Runner-ID: node_A" \
  "http://api.owlapi.com/api/v1/query/user_list?status=active"
```

---

## 3. 错误处理码

系统采用标准 HTTP 状态码表示逻辑错误。

| 状态码 | 含义 | 解决方案 |
| :--- | :--- | :--- |
| **400** | Bad Request | 检查请求头中的 `X-Tenant-ID` 或参数是否完整 |
| **401** | Unauthorized | 节点 Token 无效或租户权限校验失败 |
| **404** | Not Found | 路径对应的 SQL 端点未在控制面配置 |
| **408** | Timeout | 节点繁忙或网络隧道拥堵，建议稍后重试 |
| **500** | Server Error | 数据库执行引擎报错，请检查 SQL 语法 |

---

## 4. 环境配置参考

### Gateway Runner 环境变量

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `OWLAPI_TENANT_ID` | 归属租户 | `default` |
| `OWLAPI_RUNNER_ID` | 节点 ID | (Required) |
| `OWLAPI_RUNNER_TOKEN` | 鉴权令牌 | (Required) |
| `OWLAPI_SERVER_URL` | 控制面地址 | `localhost:9090` |
